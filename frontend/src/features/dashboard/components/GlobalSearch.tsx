import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, FileText, FolderOpen, MessageSquare } from 'lucide-react';
import { useData } from '@/app/contexts/useData';
import { useNavigate } from 'react-router-dom';
import { slugify } from '@/shared/utils/slug';
import type { Project, Message } from '@/app/contexts/DataProvider';

interface SearchResult {
  id: string;
  type: 'project' | 'message';
  title: string;
  subtitle?: string;
  description?: string;
  projectId?: string;
  messageId?: string;
  snippet?: string;
}

interface GlobalSearchProps {
  className?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { projects, projectMessages, fetchProjectDetails } = useData();

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
            searchResults.push({
              id: `project-${project.projectId}`,
              type: 'project',
              title: project.title || 'Untitled Project',
              subtitle: project.status ? `Status: ${project.status}` : undefined,
              description: project.description,
              projectId: project.projectId,
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
                const snippet = (start > 0 ? '...' : '') + 
                               fullText.slice(start, end) + 
                               (end < fullText.length ? '...' : '');

                searchResults.push({
                  id: `message-${message.messageId || message.optimisticId || Date.now()}`,
                  type: 'message',
                  title: `Message in ${projectTitle}`,
                  subtitle: message.timestamp ? new Date(message.timestamp).toLocaleDateString() : undefined,
                  snippet,
                  projectId,
                  messageId: message.messageId || message.optimisticId,
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
        await fetchProjectDetails(result.projectId);
        const project = projects?.find((p: Project) => p.projectId === result.projectId);
        const slug = slugify(project?.title || result.title);
        navigate(`/dashboard/projects/${slug}`);
      } catch (error) {
        console.error('Error navigating to project:', error);
      }
    } else if (result.type === 'message' && result.projectId) {
      try {
        await fetchProjectDetails(result.projectId);
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

          {!loading && results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className={`global-search-result ${index === selectedIndex ? 'selected' : ''}`}
            >
              <div className="global-search-result-icon">
                {getResultIcon(result.type)}
              </div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">{result.title}</div>
                {result.subtitle && (
                  <div className="global-search-result-subtitle">{result.subtitle}</div>
                )}
                {result.snippet && (
                  <div className="global-search-result-snippet">{result.snippet}</div>
                )}
                {result.description && !result.snippet && (
                  <div className="global-search-result-description">{result.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;