import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import '@testing-library/jest-dom';

// Mock the required hooks and modules
vi.mock('@/app/contexts/useData', () => ({
  useData: vi.fn()
}));

vi.mock('@/shared/utils/slug', () => ({
  slugify: vi.fn((title) => title.toLowerCase().replace(/\s+/g, '-'))
}));

vi.mock('@/shared/utils/api', () => ({
  apiFetch: vi.fn(),
  GET_PROJECT_MESSAGES_URL: 'http://test.com/messages'
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock data
const mockProjects = [
  {
    projectId: 'project-1',
    title: 'Test Project One',
    description: 'A test project for searching',
    status: 'in-progress'
  },
  {
    projectId: 'project-2',
    title: 'Demo Application',
    description: 'Another project to test search functionality',
    status: 'completed'
  }
];

const mockProjectMessages = {
  'project-1': [
    {
      messageId: 'msg-1',
      text: 'This is a test message about the project',
      timestamp: '2024-01-01T10:00:00Z'
    },
    {
      messageId: 'msg-2',
      text: 'Another message discussing features',
      timestamp: '2024-01-02T10:00:00Z'
    }
  ],
  'project-2': [
    {
      messageId: 'msg-3',
      text: 'Demo message for testing search',
      timestamp: '2024-01-03T10:00:00Z'
    }
  ]
};

const mockUseData = {
  projects: mockProjects,
  projectMessages: mockProjectMessages,
  fetchProjectDetails: vi.fn(),
  allUsers: []
};

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderGlobalSearch = () => {
    return render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );
  };

  it('renders search input', () => {
    renderGlobalSearch();
    expect(screen.getByPlaceholderText('Search projects and messages...')).toBeInTheDocument();
  });

  it('shows search results when typing', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Project One')).toBeInTheDocument();
    });
  });

  it('searches projects by title', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'demo' } });

    await waitFor(() => {
      expect(screen.getByText('Demo Application')).toBeInTheDocument();
    });
  });

  it('searches projects by description', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'functionality' } });

    await waitFor(() => {
      expect(screen.getByText('Demo Application')).toBeInTheDocument();
    });
  });

  it('searches messages content', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'features' } });

    await waitFor(() => {
      expect(screen.getByText('Message in Test Project One')).toBeInTheDocument();
    });
  });

  it('shows no results when search returns empty', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('navigates to project when project result is clicked', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      const projectResult = screen.getByText('Test Project One');
      fireEvent.click(projectResult);
    });

    expect(mockUseData.fetchProjectDetails).toHaveBeenCalledWith('project-1');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/projects/test-project-one');
  });

  it('supports keyboard navigation', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Project One')).toBeInTheDocument();
    });

    // Test arrow down navigation
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Test Enter key selection
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockUseData.fetchProjectDetails).toHaveBeenCalledWith('project-1');
  });

  it('closes search results on Escape key', async () => {
    renderGlobalSearch();
    const input = screen.getByPlaceholderText('Search projects and messages...');
    
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Project One')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Test Project One')).not.toBeInTheDocument();
    });
  });
});