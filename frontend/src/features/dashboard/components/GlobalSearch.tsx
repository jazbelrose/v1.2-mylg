import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, FileText, FolderOpen, MessageSquare } from 'lucide-react';
import { useData } from '@/app/contexts/useData';
import { useNavigate } from 'react-router-dom';
import { slugify } from '@/shared/utils/slug';
import type { Project, Message } from '@/app/contexts/DataProvider';
import { getFileUrl } from '@/shared/utils/api';
import SVGThumbnail from './SvgThumbnail';

interface HighlightPart {
  text: string;
  isMatch: boolean;
}

interface SearchResult {
  id: string;
  type: 'project' | 'message';
  title: string;
  subtitle?: string;
  description?: string;
  projectId?: string;
  messageId?: string;
  snippet?: string;
  excerpt?: string;
  thumbnailUrl?: string;
  thumbnailInitial?: string;
  status?: string;
  statusLabel?: string;
  statusClassName?: string;
  dueDate?: string;
  dueDateLabel?: string;
  highlightParts?: HighlightPart[];
}

const EXCERPT_MAX_LENGTH = 140;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildHighlightParts = (text: string, rawQuery: string): HighlightPart[] | undefined => {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) return undefined;

  const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
  const parts = text.split(regex);

  if (parts.length <= 1) {
    return undefined;
  }

  const lowerQuery = trimmedQuery.toLowerCase();

  return parts
    .filter(part => part.length > 0)
    .map(part => ({
      text: part,
      isMatch: part.toLowerCase() === lowerQuery,
    }));
};

const toSingleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

const truncate = (value: string, length = EXCERPT_MAX_LENGTH) => {
  if (!value) return value;
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
};

const collectLexicalText = (node: unknown): string => {
  if (!node) return '';

  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return toSingleLine(
      node
        .map(child => collectLexicalText(child))
        .filter(Boolean)
        .join(' ')
    );
  }

  if (typeof node !== 'object') {
    return '';
  }

  const obj = node as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof obj.text === 'string') {
    parts.push(obj.text);
  }

  if (Array.isArray(obj.children)) {
    parts.push(collectLexicalText(obj.children));
  }

  if (Array.isArray(obj.rows)) {
    parts.push(collectLexicalText(obj.rows));
  }

  if (Array.isArray(obj.cells)) {
    parts.push(collectLexicalText(obj.cells));
  }

  if (typeof obj.value === 'string') {
    parts.push(obj.value);
  }

  return toSingleLine(parts.filter(Boolean).join(' '));
};

const extractPlainText = (input: unknown): string => {
  if (!input) return '';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const fromLexical = collectLexicalText((parsed as Record<string, unknown>).root ?? parsed);
        if (fromLexical) {
          return fromLexical;
        }
      } catch {
        // fall through to HTML stripping below
      }
    }

    return toSingleLine(trimmed.replace(/<[^>]+>/g, ''));
  }

  if (typeof input === 'object') {
    const fromLexical = collectLexicalText((input as Record<string, unknown>).root ?? input);
    if (fromLexical) {
      return fromLexical;
    }
  }

  return '';
};

const createExcerpt = (description: unknown): string | undefined => {
  const plain = extractPlainText(description);
  if (!plain) return undefined;
  return truncate(toSingleLine(plain));
};

const formatDueDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusMetadata = (status?: string) => {
  if (!status) return {};

  const normalized = status.toLowerCase();
  const label = toSingleLine(
    normalized
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );

  const className = `global-search-status--${normalized.replace(/[^a-z0-9]+/g, '-')}`;

  return {
    statusLabel: label || status,
    statusClassName: className,
  };
};

const getProjectThumbnail = (project: Project) => {
  const initial = (project.title || 'Untitled project').trim().charAt(0).toUpperCase() || '#';
  const thumbnails = Array.isArray(project.thumbnails) ? project.thumbnails : [];
  const firstThumb = thumbnails.find((thumb): thumb is string => typeof thumb === 'string' && thumb.trim().length > 0);

  if (!firstThumb) {
    return { initial };
  }

  try {
    return {
      initial,
      thumbnailUrl: getFileUrl(firstThumb),
    };
  } catch (error) {
    console.warn('Failed to resolve thumbnail URL', error);
    return { initial };
  }
};

interface GlobalSearchProps {
  className?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const data = useData();
  const projects = (Array.isArray(data?.projects) ? data.projects : []) as Project[];
  const projectMessages = (data?.projectMessages && typeof data.projectMessages === 'object'
    ? data.projectMessages
    : {}) as Record<string, Message[]>;
  const fetchProjectDetails = data?.fetchProjectDetails as
    | ((projectId: string) => Promise<unknown>)
    | undefined;

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];
    const normalizedQuery = searchQuery.toLowerCase().trim();

    try {
      // Search projects
      if (projects && Array.isArray(projects)) {
        projects.forEach((project: Project) => {
          const title = (project.title || '').toLowerCase();
          const description = (project.description || '').toLowerCase();
          const status = (project.status || '').toLowerCase();

          if (
            title.includes(normalizedQuery) ||
            description.includes(normalizedQuery) ||
            status.includes(normalizedQuery)
          ) {
            const { thumbnailUrl, initial } = getProjectThumbnail(project);
            const excerpt = createExcerpt(project.description);
            const dueDateLabel = formatDueDate(project.finishline);
            const statusMeta = getStatusMetadata(project.status);
            searchResults.push({
              id: `project-${project.projectId}`,
              type: 'project',
              title: project.title || 'Untitled Project',
              projectId: project.projectId,
              excerpt,
              thumbnailUrl,
              thumbnailInitial: initial,
              status: project.status,
              statusLabel: statusMeta.statusLabel,
              statusClassName: statusMeta.statusClassName,
              dueDate: project.finishline,
              dueDateLabel: dueDateLabel,
              highlightParts: buildHighlightParts(project.title || 'Untitled Project', searchQuery),
            });
          }
        });
      }

      // Search messages across all projects
      if (projectMessages && typeof projectMessages === 'object') {
        for (const [projectId, messages] of Object.entries(projectMessages)) {
          if (Array.isArray(messages)) {
            messages.forEach((message: Message) => {
              const messageText = (message.text || message.body || message.content || '').toLowerCase();

              if (messageText.includes(normalizedQuery)) {
                const project = projects?.find((p: Project) => p.projectId === projectId);
                const projectTitle = project?.title || 'Unknown Project';

                // Create a snippet of the message
                const fullText = message.text || message.body || message.content || '';
                const index = fullText.toLowerCase().indexOf(normalizedQuery);
                const start = Math.max(0, index - 30);
                const end = Math.min(fullText.length, index + normalizedQuery.length + 30);
                const snippet = toSingleLine(
                  ((start > 0 ? '...' : '') +
                    fullText.slice(start, end) +
                    (end < fullText.length ? '...' : '')).trim()
                );

                searchResults.push({
                  id: `message-${message.messageId || message.optimisticId || Date.now()}`,
                  type: 'message',
                  title: `Message in ${projectTitle}`,
                  subtitle: message.timestamp ? new Date(message.timestamp).toLocaleDateString() : undefined,
                  snippet,
                  projectId,
                  messageId: message.messageId || message.optimisticId,
                  highlightParts: buildHighlightParts(`Message in ${projectTitle}`, searchQuery),
                });
              }
            });
          }
        }
      }

      // Sort results: projects first, then messages, then by relevance
      searchResults.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'project' ? -1 : 1;
        }
        // Sort by title relevance (exact matches first)
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aExact = aTitle === normalizedQuery;
        const bExact = bTitle === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return aTitle.localeCompare(bTitle);
      });

      setResults(searchResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Error performing search:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [projects, projectMessages]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleResultClick = async (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);

    if (result.type === 'project' && result.projectId) {
      try {
        if (fetchProjectDetails) {
          await fetchProjectDetails(result.projectId);
        }
        const project = projects?.find((p: Project) => p.projectId === result.projectId);
        const slug = slugify(project?.title || result.title);
        navigate(`/dashboard/projects/${slug}`);
      } catch (error) {
        console.error('Error navigating to project:', error);
      }
    } else if (result.type === 'message' && result.projectId) {
      try {
        if (fetchProjectDetails) {
          await fetchProjectDetails(result.projectId);
        }
        const project = projects?.find((p: Project) => p.projectId === result.projectId);
        const slug = slugify(project?.title || 'project');
        navigate(`/dashboard/projects/${slug}`, {
          state: { highlightMessage: result.messageId }
        });
      } catch (error) {
        console.error('Error navigating to message:', error);
      }
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen size={16} />;
      case 'message':
        return <MessageSquare size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className={`global-search ${className}`} ref={searchBoxRef}>
      <div className="global-search-input-container">
        <Search size={16} className="global-search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search projects and messages..."
          className="global-search-input"
        />
        {query && (
          <button
            onClick={handleClear}
            className="global-search-clear"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (query || results.length > 0) && (
        <div className="global-search-results">
          {loading && (
            <div className="global-search-result loading">
              <div className="global-search-result-icon">
                <Search size={16} />
              </div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">Searching...</div>
              </div>
            </div>
          )}
          
          {!loading && results.length === 0 && query && (
            <div className="global-search-result no-results">
              <div className="global-search-result-icon">
                <Search size={16} />
              </div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">No results found</div>
                <div className="global-search-result-subtitle">
                  Try searching for project names, descriptions, or message content
                </div>
              </div>
            </div>
          )}

          {!loading && results.map((result, index) => {
            const isProject = result.type === 'project';
            const titleParts = result.highlightParts && result.highlightParts.length > 0
              ? result.highlightParts
              : [{ text: result.title, isMatch: false }];

            return (
              <button
                key={result.id}
                type="button"
                onClick={() => handleResultClick(result)}
                className={`global-search-result ${isProject ? 'project-result' : ''} ${index === selectedIndex ? 'selected' : ''}`}
              >
                {isProject ? (
                  <div className="global-search-thumbnail" aria-hidden>
                    {result.thumbnailUrl && !imageErrors[result.id] ? (
                      <img
                        src={result.thumbnailUrl}
                        alt=""
                        className="global-search-thumbnail-image"
                        onError={() =>
                          setImageErrors(prev => ({ ...prev, [result.id]: true }))
                        }
                      />
                    ) : (
                      <SVGThumbnail
                        initial={result.thumbnailInitial || '#'}
                        className="global-search-thumbnail-placeholder"
                      />
                    )}
                  </div>
                ) : (
                  <div className="global-search-result-icon" aria-hidden>
                    {getResultIcon(result.type)}
                  </div>
                )}
                <div className="global-search-result-content">
                  <div className="global-search-title-row">
                    <div className="global-search-result-title">
                      {titleParts.map((part, partIndex) =>
                        part.isMatch ? (
                          <mark key={`${result.id}-part-${partIndex}`}>{part.text}</mark>
                        ) : (
                          <span key={`${result.id}-part-${partIndex}`}>{part.text}</span>
                        )
                      )}
                    </div>
                    {isProject && result.statusLabel && (
                      <span className={`global-search-status ${result.statusClassName || ''}`}>
                        {result.statusLabel}
                      </span>
                    )}
                  </div>
                  {isProject && result.dueDateLabel && (
                    <div className="global-search-meta">
                      <span className="global-search-meta-label">Due</span>
                      <span className="global-search-meta-value">{result.dueDateLabel}</span>
                    </div>
                  )}
                  {!isProject && result.subtitle && (
                    <div className="global-search-result-subtitle">{result.subtitle}</div>
                  )}
                  {result.snippet && (
                    <div className="global-search-result-snippet">{result.snippet}</div>
                  )}
                  {isProject && result.excerpt && (
                    <div className="global-search-result-excerpt">{result.excerpt}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;