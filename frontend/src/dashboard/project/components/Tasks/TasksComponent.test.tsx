import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";

import TasksComponent from "./TasksComponent";

vi.mock("@/dashboard/project/components/Shared/LocationComponent", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-location" />,
}));

const apiMocks = vi.hoisted(() => ({
  fetchTasksMock: vi.fn(),
  createTaskMock: vi.fn(),
  fetchUserProfilesBatchMock: vi.fn(),
}));

vi.mock("@/shared/utils/api", () => ({
  fetchTasks: apiMocks.fetchTasksMock,
  createTask: apiMocks.createTaskMock,
  fetchUserProfilesBatch: apiMocks.fetchUserProfilesBatchMock,
}));

const { fetchTasksMock, createTaskMock, fetchUserProfilesBatchMock } = apiMocks;

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  fetchTasksMock.mockReset();
  createTaskMock.mockReset();
  fetchUserProfilesBatchMock.mockReset();

  fetchTasksMock.mockResolvedValue([]);
  fetchUserProfilesBatchMock.mockResolvedValue([]);
  createTaskMock.mockResolvedValue({});
});

test("loads tasks and splits into my and team sections", async () => {
  fetchTasksMock.mockResolvedValue([
    {
      taskId: "1",
      projectId: "p1",
      title: "Confirm venue walkthrough",
      status: "done",
      assigneeId: "user-1",
      dueDate: "2025-09-23",
      priority: "high",
    },
    {
      taskId: "2",
      projectId: "p1",
      title: "Order vinyl print",
      status: "in_progress",
      assigneeId: "user-2",
      dueDate: "2020-01-01",
      priority: "medium",
    },
  ]);
  fetchUserProfilesBatchMock.mockResolvedValue([
    { userId: "user-1", firstName: "Jaz" },
    { userId: "user-2", firstName: "Art", lastName: "Pa" },
  ]);

  render(
    <TasksComponent
      projectId="p1"
      userId="user-1"
      team={[
        { userId: "user-1", firstName: "Jaz" },
        { userId: "user-2", firstName: "Art", lastName: "Pa" },
      ]}
      activeProject={{ projectId: "p1", title: "Project 1" } as any}
      onActiveProjectChange={vi.fn()}
    />
  );

  await waitFor(() => expect(fetchTasksMock).toHaveBeenCalledTimes(1));

  expect((await screen.findAllByText("Confirm venue walkthrough")).length).toBeGreaterThan(0);
  expect((await screen.findAllByText("Order vinyl print")).length).toBeGreaterThan(0);

  await waitFor(() => {
    const [completedLabel] = screen.getAllByText(/Completed/);
    expect(completedLabel.parentElement?.querySelector("strong")?.textContent).toBe("1");
  });

  await waitFor(() => {
    const [overdueLabel] = screen.getAllByText(/Overdue/);
    expect(overdueLabel.parentElement?.querySelector("strong")?.textContent).toBe("1");
  });

  await waitFor(() => {
    const [myTasksHeading] = screen.getAllByText("My Tasks");
    expect(myTasksHeading.parentElement?.querySelector(".ov-pill")?.textContent).toBe("1");
  });

  await waitFor(() => {
    const [teamTasksHeading] = screen.getAllByText("Team Tasks");
    expect(teamTasksHeading.parentElement?.querySelector(".ov-pill")?.textContent).toBe("1");
  });
});

test("allows quick adding tasks and syncs with the api", async () => {
  fetchTasksMock
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        taskId: "101",
        projectId: "p1",
        title: "New quick task",
        status: "todo",
        assigneeId: "user-1",
        priority: "high",
      },
    ]);
  fetchUserProfilesBatchMock.mockResolvedValue([
    { userId: "user-1", firstName: "Jaz" },
  ]);
  createTaskMock.mockResolvedValue({
    taskId: "101",
    projectId: "p1",
    title: "New quick task",
    status: "todo",
    assigneeId: "user-1",
    priority: "high",
  });

  const user = userEvent.setup();

  render(
    <TasksComponent
      projectId="p1"
      userId="user-1"
      team={[{ userId: "user-1", firstName: "Jaz" }]}
      activeProject={{ projectId: "p1", title: "Project 1" } as any}
      onActiveProjectChange={vi.fn()}
    />
  );

  await waitFor(() => expect(fetchTasksMock).toHaveBeenCalledTimes(1));

  const [titleInput] = screen.getAllByLabelText("Task title");
  await user.type(titleInput, "New quick task");

  const [prioritySelect] = screen.getAllByLabelText("Priority");
  await user.selectOptions(prioritySelect, "High");

  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1));
  expect(createTaskMock).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: "p1",
      title: "New quick task",
      status: "todo",
      priority: "high",
      assigneeId: "user-1",
    })
  );

  await waitFor(() => expect(fetchTasksMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  expect(titleInput).toHaveValue("");
});
