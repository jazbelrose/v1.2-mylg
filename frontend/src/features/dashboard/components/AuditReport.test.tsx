import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuditReport from './AuditReport';

// Mock dependencies
vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn(() => '2025-09-14'),
    split: vi.fn(() => ['2025-09-14'])
  }))
}));

vi.mock('antd', () => ({
  Card: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  Spin: () => <div data-testid="spinner">Loading...</div>,
  Alert: ({ message }: { message: string }) => <div data-testid="alert">{message}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Select: ({ children, value, onChange }: { children: React.ReactNode; value: any; onChange: (val: any) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  ),
  DatePicker: ({ value, onChange }: { value: any; onChange: (date: any) => void }) => (
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  Row: ({ children }: { children: React.ReactNode }) => <div className="row">{children}</div>,
  Col: ({ children }: { children: React.ReactNode }) => <div className="col">{children}</div>,
  Statistic: ({ title, value }: { title: string; value: any }) => (
    <div data-testid="statistic">
      <span>{title}: {value}</span>
    </div>
  ),
  Progress: ({ percent }: { percent: number }) => (
    <div data-testid="progress">{percent}%</div>
  ),
  Table: ({ dataSource }: { dataSource: any[] }) => (
    <table data-testid="table">
      <tbody>
        {dataSource.map((item, index) => (
          <tr key={index}>
            <td>{JSON.stringify(item)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  Tag: ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <span className={`tag ${color}`}>{children}</span>
  )
}));

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span>Download</span>,
  ReloadOutlined: () => <span>Reload</span>,
  BarChartOutlined: () => <span>Chart</span>
}));

describe('AuditReport', () => {
  it('renders loading state initially', () => {
    render(<AuditReport />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Generating comprehensive audit report...')).toBeInTheDocument();
  });

  it('renders report data after loading', async () => {
    render(<AuditReport />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Check if main components are rendered
    expect(screen.getByText('Comprehensive Audit Report')).toBeInTheDocument();
    expect(screen.getByText('Report Metadata')).toBeInTheDocument();
    expect(screen.getByText('Projects Analytics')).toBeInTheDocument();
    expect(screen.getByText('Budget Analytics')).toBeInTheDocument();
    expect(screen.getByText('User Activity Analytics')).toBeInTheDocument();
    expect(screen.getByText('Events & Tasks Analytics')).toBeInTheDocument();
    expect(screen.getByText('System Health Metrics')).toBeInTheDocument();
  });

  it('displays correct statistics', async () => {
    render(<AuditReport />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Check for statistics
    const statistics = screen.getAllByTestId('statistic');
    expect(statistics.length).toBeGreaterThan(0);
    
    // Check for specific project statistics
    expect(screen.getByText(/Total Projects: 42/)).toBeInTheDocument();
    expect(screen.getByText(/Modified on Date: 7/)).toBeInTheDocument();
  });

  it('has export functionality', async () => {
    render(<AuditReport />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();
  });

  it('has refresh functionality', async () => {
    render(<AuditReport />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  it('displays date picker for report date selection', async () => {
    render(<AuditReport />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    const datePicker = screen.getByDisplayValue('2025-09-14');
    expect(datePicker).toBeInTheDocument();
  });
});