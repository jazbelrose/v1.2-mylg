import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi, test, expect } from 'vitest';
import TasksComponent from './TasksComponent';

vi.mock('@/shared/ui/Map', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}));

type Mock = ReturnType<typeof vi.fn>;

let fetchTasksMock: Mock;
let deleteTaskMock: Mock;

vi.mock('@/shared/utils/api', () => ({
  __esModule: true,
  fetchTasks: vi.fn(() => Promise.resolve([])),
  deleteTask: vi.fn(() => Promise.resolve({})),
  fetchUserProfilesBatch: vi.fn(() => Promise.resolve([])),
  createTask: vi.fn((payload) => Promise.resolve(payload)),
  updateTask: vi.fn((payload) => Promise.resolve(payload)),
}));

const mockUseBudget = vi.fn(() => ({ budgetItems: [] }));
vi.mock('@/dashboard/project/features/budget/context/BudgetContext', () => ({
  __esModule: true,
  useBudget: (...args: unknown[]) => mockUseBudget(...args),
}));

vi.mock('antd', () => {
  const React = require('react');
  const formInstance = {
    getFieldValue: vi.fn(),
    setFieldsValue: vi.fn(),
    resetFields: vi.fn(),
    validateFields: vi.fn(() => Promise.resolve({})),
  };

  const Form = Object.assign(
    ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
    {
      Item: ({ children, label, name }: any) => (
        <div>
          {label && <label htmlFor={name}>{label}</label>}
          {React.isValidElement(children)
            ? React.cloneElement(children, { id: name, name })
            : children}
        </div>
      ),
      useForm: () => [{ ...formInstance }],
    },
  );

  const List = ({ dataSource = [], renderItem, locale }: any) => {
    if (!dataSource.length) {
      return <div>{locale?.emptyText ?? null}</div>;
    }
    return (
      <div>
        {dataSource.map((item: any, index: number) => (
          <div key={item.id ?? index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  };

  List.Item = ({ children, onClick }: any) => (
    <div onClick={onClick} role="listitem">
      {children}
    </div>
  );

  const Table = ({ columns = [], dataSource = [], locale, onRow }: any) => {
    if (!dataSource.length) {
      return <div>{locale?.emptyText ?? 'No data'}</div>;
    }
    return (
      <div>
        {dataSource.map((record: any) => {
          const rowProps = onRow ? onRow(record) : {};
          return (
            <div key={record.id ?? record.taskId} onClick={rowProps?.onClick}>
              {columns.map((col: any) => {
                if (col.render) {
                  return <div key={col.key}>{col.render(record[col.dataIndex], record)}</div>;
                }
                return <div key={col.key}>{record[col.dataIndex]}</div>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return {
    ConfigProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    theme: { darkAlgorithm: {} },
    message: { error: vi.fn(), success: vi.fn() },
    Button: ({ children, onClick, ...props }: any) => (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Card: ({ title, extra, children }: any) => (
      <div>
        <div>{title}</div>
        <div>{extra}</div>
        <div>{children}</div>
      </div>
    ),
    Drawer: ({ open, children, title }: any) =>
      open ? (
        <div data-testid="tasks-drawer">
          <div>{title}</div>
          {children}
        </div>
      ) : null,
    List,
    Table,
    Form,
    Select: ({ children, onChange, value, ...props }: any) => (
      <select value={value} onChange={(e) => onChange?.(e.target.value)} {...props}>
        {children}
      </select>
    ),
    Input: Object.assign(
      ({ onChange, value, ...props }: any) => (
        <input value={value ?? ''} onChange={onChange} {...props} />
      ),
      {
        TextArea: ({ value, onChange, ...props }: any) => (
          <textarea value={value} onChange={onChange} {...props} />
        ),
      },
    ),
    DatePicker: ({ value, onChange }: any) => (
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    ),
    AutoComplete: ({ value, onChange, ...props }: any) => (
      <input value={value ?? ''} onChange={onChange} {...props} />
    ),
    Dropdown: ({ menu, children }: any) => (
      <div>
        {children}
        {(menu?.items ?? []).map((item: any) => (
          <button key={item.key} onClick={() => menu?.onClick?.({ key: item.key })}>
            {item.label}
          </button>
        ))}
      </div>
    ),
    Modal: ({ open, children, title, onOk, onCancel }: any) =>
      open ? (
        <div>
          <div>{title}</div>
          <button onClick={onOk}>ok</button>
          <button onClick={onCancel}>cancel</button>
          {children}
        </div>
      ) : null,
    Space: ({ children }: any) => <div>{children}</div>,
    Typography: {
      Title: ({ children }: any) => <h5>{children}</h5>,
      Text: ({ children }: any) => <span>{children}</span>,
    },
    Tooltip: ({ children }: any) => <>{children}</>,
    Grid: {
      useBreakpoint: () => ({ md: true }),
    },
  };
});

beforeEach(async () => {
  const apiModule = await import('@/shared/utils/api');
  fetchTasksMock = apiModule.fetchTasks as Mock;
  deleteTaskMock = apiModule.deleteTask as Mock;

  fetchTasksMock.mockReset();
  fetchTasksMock.mockResolvedValue([]);
  deleteTaskMock.mockReset();
  deleteTaskMock.mockResolvedValue({});
});

test('renders upcoming tasks empty state by default', async () => {
  render(<TasksComponent projectId="p1" team={[]} />);
  expect(await screen.findByText('No upcoming tasks')).toBeInTheDocument();
});

test('renders fetched tasks in upcoming list', async () => {
  fetchTasksMock.mockResolvedValueOnce([
    { projectId: 'p1', taskId: '1', title: 'Sample Task', dueDate: '2024-01-01' },
  ]);

  render(<TasksComponent projectId="p1" team={[]} />);

  await waitFor(() => expect(screen.getByText('SAMPLE TASK')).toBeInTheDocument());
});

test('opens drawer when clicking view all', async () => {
  render(<TasksComponent projectId="p1" team={[]} />);

  const button = await screen.findByRole('button', { name: 'View All' });
  await userEvent.click(button);

  expect(await screen.findByTestId('tasks-drawer')).toBeInTheDocument();
});
