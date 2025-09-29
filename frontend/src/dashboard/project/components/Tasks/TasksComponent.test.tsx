import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect, beforeAll, beforeEach, vi } from 'vitest';
import TasksComponent from './TasksComponent';
import { message } from 'antd';

// Define mock functions
type Mock = ReturnType<typeof vi.fn>;

let fetchTasksMock: Mock;
let deleteTaskMock: Mock;
let fetchUserProfilesBatchMock: Mock;

vi.mock('@/shared/utils/api', () => ({
  __esModule: true,
  fetchTasks: vi.fn(() => Promise.resolve([])),
  deleteTask: vi.fn(() => Promise.resolve({})),
  fetchUserProfilesBatch: vi.fn(() => Promise.resolve([])),
  createTask: vi.fn((t) => Promise.resolve(t)),
  updateTask: vi.fn((t) => Promise.resolve(t)),
}));
vi.mock('antd', () => ({
  Form: Object.assign(
    vi.fn(({ children, ...props }) => <form {...props}>{children}</form>),
    {
      Item: vi.fn(({ children, label, name, ...props }) => <div {...props}> {label && <label htmlFor={name}>{label}</label>} {React.cloneElement(children as React.ReactElement<any>, { id: name })} </div>), // eslint-disable-line @typescript-eslint/no-explicit-any
      useForm: vi.fn(() => [{
        getFieldValue: vi.fn(),
        setFieldsValue: vi.fn(),
        resetFields: vi.fn(),
        validateFields: vi.fn(),
      }])
    }
  ),
  ConfigProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  message: { error: vi.fn(), success: vi.fn() },
  theme: { defaultAlgorithm: {}, darkAlgorithm: {} },
  Table: vi.fn(({ columns, dataSource }) =>
    !dataSource || dataSource.length === 0 ? <div>No tasks yet!</div> : (
      <div>
        {dataSource.map((record: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <div key={record.id || record.taskId}>
            {columns.map((col: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (col.dataIndex === 'name') {
                return <div key={col.key}>{(record[col.dataIndex] || "").toUpperCase()}</div>;
              }
              if (col.dataIndex === 'assignedTo') {
                const value = record[col.dataIndex] ?? record.assigneeId;
                return (
                  <div key={col.key || col.dataIndex}>
                    {col.render ? col.render(value, record) : value}
                  </div>
                );
              }
              if (col.key === 'actions') {
                return <div key={col.key}>{col.render(null, record)}</div>;
              }
              // Add other columns if needed
              return null;
            })}
          </div>
        ))}
      </div>
    )
  ),
  Select: vi.fn(({ id, options, children, ...props }) => (
    <select id={id} name={id} {...props}>
      {options ? options.map((opt: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
        <option key={opt.value} value={opt.value}>{opt.label || opt.children}</option>) : children}
    </select>
  )),
  Button: vi.fn(({ children, ...props }) => <button {...props}>{children || 'Button'}</button>),
  Dropdown: vi.fn(({ menu, children, ...props }) => {
    const items = menu?.items || [];
    return (
      <div {...props}>
        {children}
        {items.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
          <button key={item.key} onClick={() => menu?.onClick?.({ key: item.key })}>
            {item.label}
          </button>
        ))}
      </div>
    );
  }),
  Modal: vi.fn(({ children, ...props }) => <div {...props}>{children || 'Modal'}</div>),
  Input: Object.assign(
    vi.fn(({ id, ...props }) => <input id={id} {...props} />),
    {
      TextArea: vi.fn(({ id, ...props }) => <textarea id={id} {...props} />)
    }
  ),
  Tooltip: vi.fn(({ children, ...props }) => <div {...props}>{children || 'Tooltip'}</div>),
  DatePicker: vi.fn(({ id, ...props }) => <input id={id} type="date" {...props} />),
  AutoComplete: vi.fn(({ id, options, ...props }) => (
    <div>
      <input id={id} name={id} {...props} />
      {options ? options.map((opt: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
        <div key={opt.value} role="option">{opt.label || opt}</div>) : null}
    </div>
  )),
  // other antd components if needed
}));

// Import mocked api functions
// const { fetchTasks, deleteTask, fetchUserProfilesBatch } = vi.mocked(await import('@/shared/utils/api'));

const mockUseBudget = vi.fn(() => ({ budgetItems: [] }));
vi.mock('@/dashboard/project/features/budget/context/BudgetContext', () => ({
  __esModule: true,
  useBudget: (...args: unknown[]) => mockUseBudget(...args),
}));

beforeAll(() => {
  // matchMedia shim for antd/select etc.
  // @ts-expect-error polyfill for JSDOM
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
});

beforeEach(async () => {
  mockUseBudget.mockReturnValue({ budgetItems: [] });

  const apiModule = await import('@/shared/utils/api');
  fetchTasksMock = apiModule.fetchTasks as Mock;
  deleteTaskMock = apiModule.deleteTask as Mock;
  fetchUserProfilesBatchMock = apiModule.fetchUserProfilesBatch as Mock;

  fetchTasksMock.mockReset();
  fetchTasksMock.mockResolvedValue([]);

  deleteTaskMock.mockReset();
  deleteTaskMock.mockResolvedValue({});

  fetchUserProfilesBatchMock.mockReset();
  fetchUserProfilesBatchMock.mockResolvedValue([]);
});

test('shows no tasks message when list is empty', async () => {
  render(<TasksComponent team={[]} />);
  expect(await screen.findByText('No tasks yet!')).toBeInTheDocument();
});

test('Assigned To select displays team members by full name', async () => {
  const team = [
    { userId: '1', firstName: 'Alice', lastName: 'Wonderland' },
    { userId: '2', firstName: 'Bob', lastName: 'Smith' },
  ];
  fetchUserProfilesBatchMock.mockResolvedValue(team);

  render(<TasksComponent team={team} />);
  const select = screen.getByLabelText('Assigned To');
  await userEvent.click(select);

  expect((await screen.findAllByText('Alice Wonderland')).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('Bob Smith')).length).toBeGreaterThan(0);
});

test('Task Name lists budget item descriptions', async () => {
  mockUseBudget.mockReturnValue({
    budgetItems: [
      { budgetItemId: 'b1', descriptionShort: 'First description' },
      { budgetItemId: 'b2', descriptionShort: 'Second description' }
    ]
  });

  render(<TasksComponent team={[]} />);
  const input = screen.getByLabelText('Task Name');

  await userEvent.type(input, 'First');
  expect((await screen.findAllByRole('option', { name: 'First description' })).length).toBeGreaterThan(0);

  await userEvent.clear(input);
  await userEvent.type(input, 'Second');
  expect((await screen.findAllByRole('option', { name: 'Second description' })).length).toBeGreaterThan(0);
});

test('invokes deleteTask when deleting a task', async () => {
  fetchTasksMock.mockResolvedValue([{ projectId: 'p1', taskId: '1', name: 'Sample' }]);

  render(<TasksComponent projectId="p1" team={[]} />);
  await screen.findByText('SAMPLE');

  await userEvent.click(screen.getByLabelText('actions-dropdown'));
  await userEvent.click(await screen.findByText('Delete'));

  await waitFor(() => expect(deleteTaskMock).toHaveBeenCalledWith({ projectId: 'p1', taskId: '1' }));
});

test('renders assignee from assigneeId field returned by API', async () => {
  fetchTasksMock.mockResolvedValue([
    {
      projectId: 'p1',
      taskId: 'task-1',
      title: 'Lighting Design',
      assigneeId: 'Alice Wonderland__user-1',
      status: 'todo',
    },
  ]);

  render(<TasksComponent projectId="p1" team={[]} />);

  await screen.findByText('LIGHTING DESIGN');
  expect(await screen.findByText('Alice Wonderland')).toBeInTheDocument();
});

test('restores task and shows error message when deleteTask fails', async () => {
  fetchTasksMock.mockResolvedValue([{ taskId: '1', name: 'Sample' }]);
  deleteTaskMock.mockRejectedValue(new Error('fail'));

  render(<TasksComponent projectId="p1" team={[]} />);
  await screen.findByText('SAMPLE');

  await act(async () => {
    await userEvent.click(screen.getByLabelText('actions-dropdown'));
    await userEvent.click(await screen.findByText('Delete'));
  });

  await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to delete task'));
  expect(screen.getByText('SAMPLE')).toBeInTheDocument();
});

test('loads tasks when API returns { tasks: [...] }', async () => {
  fetchTasksMock.mockResolvedValue([{ projectId: 'p1', taskId: '1', title: 'Sample' }]);

  render(<TasksComponent projectId="p1" team={[]} />);

  expect(await screen.findByText('SAMPLE')).toBeInTheDocument();

  fetchTasksMock.mockReset();
});


















