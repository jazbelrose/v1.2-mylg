import React, { useEffect, useState } from "react";
import { Button, ConfigProvider, Dropdown, Form, Select, Tooltip, message, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import { DeleteOutlined, DownOutlined, EditOutlined, MessageOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";

import {
  NOMINATIM_SEARCH_URL,
  apiFetch,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchUserProfilesBatch,
} from "@/shared/utils/api";
import { useBudget } from "@/dashboard/project/features/budget/context/BudgetContext";
import AssignTaskForm from "./components/AssignTaskForm";
import CommentModal from "./components/CommentModal";
import TaskEditModal from "./components/TaskEditModal";
import TaskTable from "./components/TaskTable";
import type {
  ApiTask,
  NominatimSuggestion,
  Status,
  Task,
  TaskLocation,
  TeamMember,
} from "./types";
import {
  STATUS_OPTIONS,
  buildAssigneeOptions,
  buildBudgetOptions,
  buildTaskNameOptions,
  formatAssigneeDisplay,
  mapApiTaskToTask,
  sortByProximity,
} from "./utils";
import "./task-table.css";

type TasksComponentProps = {
  projectId?: string;
  userId?: string;
  team?: TeamMember[];
};

const TasksComponent: React.FC<TasksComponentProps> = ({ projectId = "", team = [] }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState("");

  const [assignForm] = Form.useForm();
  const [assignLocationSearch, setAssignLocationSearch] = useState("");
  const [assignLocationSuggestions, setAssignLocationSuggestions] = useState<NominatimSuggestion[]>([]);
  const [assignTaskLocation, setAssignTaskLocation] = useState<TaskLocation>({ lat: "", lng: "" });
  const [assignTaskAddress, setAssignTaskAddress] = useState("");

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setUserLocation(null)
    );
  }, []);

  const fetchAssignLocationSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAssignLocationSuggestions([]);
      return;
    }

    try {
      const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
      const response = await apiFetch(url);
      const results = sortByProximity((response as NominatimSuggestion[]) || [], userLocation);
      setAssignLocationSuggestions(results);
    } catch {
      setAssignLocationSuggestions([]);
    }
  };

  const handleAssignLocationSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAssignLocationSearch(value);
    fetchAssignLocationSuggestions(value);
  };

  const handleAssignLocationSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const location = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    setAssignTaskLocation(location);
    setAssignTaskAddress(suggestion.display_name);
    setAssignLocationSearch(suggestion.display_name);
    setAssignLocationSuggestions([]);
    assignForm.setFieldsValue({ location, address: suggestion.display_name });
  };

  const [editForm] = Form.useForm();
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimSuggestion[]>([]);
  const [taskLocation, setTaskLocation] = useState<TaskLocation>({ lat: "", lng: "" });
  const [taskAddress, setTaskAddress] = useState("");

  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
      const response = await apiFetch(url);
      setLocationSuggestions((response as NominatimSuggestion[]) || []);
    } catch {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocationSearch(value);
    fetchLocationSuggestions(value);
  };

  const handleLocationSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const location = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    setTaskLocation(location);
    setTaskAddress(suggestion.display_name);
    setLocationSearch(suggestion.display_name);
    setLocationSuggestions([]);
    editForm.setFieldsValue({ location, address: suggestion.display_name });
  };

  const { budgetItems } = useBudget();
  const [teamProfiles, setTeamProfiles] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!Array.isArray(team) || team.length === 0) {
        setTeamProfiles([]);
        return;
      }

      const userIds = team.map((member) => member.userId).filter(Boolean);
      const profiles = await fetchUserProfilesBatch(userIds);
      setTeamProfiles(profiles || []);
    };

    fetchProfiles();
  }, [team]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks(projectId);
        const mapped: Task[] = (data || []).map((task: ApiTask) => mapApiTaskToTask(task));
        setTasks(mapped);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
        setTasks([]);
      }
    };

    loadTasks();
  }, [projectId]);

  const assigneeOptions = buildAssigneeOptions(teamProfiles);
  const budgetArray = Array.isArray(budgetItems)
    ? (budgetItems as Record<string, unknown>[])
    : ([] as Record<string, unknown>[]);
  const budgetOptions = buildBudgetOptions(budgetArray);
  const taskNameOptions = buildTaskNameOptions(budgetArray);

  const handleAssignTask = async () => {
    try {
      const values = await assignForm.validateFields();
      const id = uuidv4();
      const normalizedName = (values.name || "").toUpperCase();
      const due: Dayjs | string | undefined = values.dueDate;

      const payload: ApiTask = {
        projectId,
        taskId: id,
        assigneeId: values.assignedTo || "",
        budgetItemId: values.budgetCode || "",
        description: "",
        dueDate:
          due && typeof due !== "string"
            ? due.format("YYYY-MM-DD")
            : (due as string) || "",
        title: normalizedName,
        priority: values.priority || "",
        status: "todo",
        location: values.location || assignTaskLocation,
        address: values.address || assignTaskAddress,
      };

      const saved = await createTask(payload);
      const combined = mapApiTaskToTask({ ...payload, ...saved }, id);
      const savedAssignee =
        (saved.assigneeId || (saved as ApiTask).assignedTo || combined.assigneeId || "") as string;
      const mappedTask: Task = { ...combined, assigneeId: savedAssignee, assignedTo: savedAssignee };

      setTasks((previous) => [...previous, mappedTask]);

      assignForm.resetFields();
      setAssignTaskLocation({ lat: "", lng: "" });
      setAssignTaskAddress("");
      setAssignLocationSearch("");
      setAssignLocationSuggestions([]);
    } catch (error) {
      console.error("Failed to assign task", error);
      message.error("Failed to assign task");
    }
  };

  const openTaskModal = (task?: Task) => {
    const targetTask = task || null;
    setEditingTask(targetTask);
    setIsTaskModalOpen(true);

    if (targetTask) {
      editForm.setFieldsValue({ ...targetTask, assignedTo: targetTask.assignedTo || targetTask.assigneeId || "" });
      setTaskLocation(targetTask.location || { lat: "", lng: "" });
      setTaskAddress(targetTask.address || "");
      setLocationSearch(targetTask.address || "");
    } else {
      editForm.setFieldsValue({
        name: "",
        assignedTo: "",
        dueDate: "",
        priority: "",
        budgetItemId: "",
        eventId: "",
        location: { lat: "", lng: "" },
        address: "",
      });
      setTaskLocation({ lat: "", lng: "" });
      setTaskAddress("");
      setLocationSearch("");
    }

    setLocationSuggestions([]);
  };

  const saveTask = async () => {
    try {
      const values = await editForm.validateFields();
      const id = editingTask?.taskId || editingTask?.id || uuidv4();
      const normalizedName = (values.name || "").toUpperCase();
      const due: Dayjs | string | undefined = values.dueDate;

      const payload: ApiTask = {
        projectId,
        taskId: id,
        assigneeId: values.assignedTo || editingTask?.assigneeId || "",
        budgetItemId: values.budgetItemId || editingTask?.budgetItemId || "",
        description: editingTask?.description || "",
        dueDate:
          due && typeof due !== "string"
            ? due.format("YYYY-MM-DD")
            : (due as string) || editingTask?.dueDate || "",
        title: normalizedName,
        priority: values.priority || editingTask?.priority || "",
        status: (editingTask?.status || "todo") as Status,
        location: values.location || taskLocation,
        address: values.address || taskAddress,
        eventId: values.eventId || editingTask?.eventId,
      };

      const saved = editingTask ? await updateTask(payload) : await createTask(payload);
      const merged = mapApiTaskToTask({ ...editingTask, ...payload, ...saved }, id);
      const savedAssignee =
        (saved.assigneeId || (saved as ApiTask).assignedTo || merged.assigneeId || "") as string;
      const mappedTask: Task = { ...merged, assigneeId: savedAssignee, assignedTo: savedAssignee };

      setTasks((previous) => {
        const exists = previous.some((taskItem) => taskItem.id === mappedTask.id);
        return exists
          ? previous.map((taskItem) => (taskItem.id === mappedTask.id ? mappedTask : taskItem))
          : [...previous, mappedTask];
      });

      setIsTaskModalOpen(false);
      setEditingTask(null);
      editForm.resetFields();
      setTaskLocation({ lat: "", lng: "" });
      setTaskAddress("");
      setLocationSearch("");
      setLocationSuggestions([]);
    } catch (error) {
      console.error("Failed to save task", error);
      message.error("Failed to save task");
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    const normalized = (status || "todo").toLowerCase().replace(/\s+/g, "_") as Status;
    setTasks((previous) => previous.map((task) => (task.id === id ? { ...task, status: normalized } : task)));
  };

  const openCommentModal = (task: Task) => {
    setCommentTask(task);
    setCommentText(task.description || "");
    setIsCommentModalOpen(true);
  };

  const saveComment = () => {
    if (!commentTask) return;
    setTasks((previous) =>
      previous.map((task) => (task.id === commentTask.id ? { ...task, description: commentText } : task))
    );
    setIsCommentModalOpen(false);
    setCommentTask(null);
  };

  const handleMenuClick = (task: Task): MenuProps["onClick"] =>
    async ({ key }) => {
      if (key === "edit") {
        openTaskModal(task);
        return;
      }

      if (key === "delete") {
        const previousTasks = tasks;
        setTasks((current) => current.filter((item) => item.id !== task.id));
        try {
          await deleteTask({ projectId: task.projectId, taskId: task.taskId || task.id });
        } catch (error) {
          console.error("Failed to delete task", error);
          setTasks(previousTasks);
          message.error("Failed to delete task");
        }
      }
    };

  const columns: ColumnsType<Task> = [
    {
      title: "Task",
      dataIndex: "name",
      key: "name",
      width: 150,
      ellipsis: true,
      render: (text: string) => (text || "").toUpperCase(),
    },
    {
      title: "Assignee",
      dataIndex: "assignedTo",
      key: "assignedTo",
      width: 120,
      ellipsis: true,
      render: (text?: string) => formatAssigneeDisplay(text) || text,
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 110,
      ellipsis: true,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      className: "status-column",
      onHeaderCell: () => ({ colSpan: 3 }),
      render: (text: Status, record) => (
        <Select
          aria-label="status-select"
          value={text}
          size="small"
          style={{ width: "100%", minWidth: 120 }}
          onChange={(value) => handleStatusChange(record.id, value)}
          options={STATUS_OPTIONS}
        />
      ),
    },
    {
      title: "",
      dataIndex: "comments",
      key: "comments",
      width: 32,
      align: "center",
      className: "comment-column",
      onHeaderCell: () => ({ colSpan: 0 }),
      render: (text: string | undefined, record) => (
        <Tooltip title={text || "Add comment"}>
          <Button
            type="text"
            size="small"
            aria-label="comment-button"
            icon={<MessageOutlined />}
            onClick={() => openCommentModal(record)}
          />
        </Tooltip>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 40,
      align: "center",
      className: "actions-column",
      onHeaderCell: () => ({ colSpan: 0 }),
      render: (_: unknown, record) => {
        const items: MenuProps["items"] = [
          { key: "edit", label: "Edit", icon: <EditOutlined /> },
          { key: "delete", label: "Delete", icon: <DeleteOutlined /> },
        ];
        return (
          <Dropdown menu={{ items, onClick: handleMenuClick(record) }} trigger={["click"]}>
            <Button
              type="text"
              size="small"
              aria-label="actions-dropdown"
              icon={<DownOutlined />}
            />
          </Dropdown>
        );
      },
    },
  ];

  const locationDisplay =
    taskLocation.lat && taskLocation.lng ? `${taskLocation.lat}, ${taskLocation.lng}` : "";

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="tasks-component">
        <div className="tasks-card">
          <AssignTaskForm
            form={assignForm}
            taskNameOptions={taskNameOptions}
            assigneeOptions={assigneeOptions}
            budgetOptions={budgetOptions}
            locationSearch={assignLocationSearch}
            locationSuggestions={assignLocationSuggestions}
            selectedAddress={assignTaskAddress}
            onLocationSearchChange={handleAssignLocationSearchChange}
            onLocationSuggestionSelect={handleAssignLocationSuggestionSelect}
            onSubmit={handleAssignTask}
          />

          <TaskTable columns={columns} data={tasks} />

          <TaskEditModal
            open={isTaskModalOpen}
            isEditing={Boolean(editingTask)}
            form={editForm}
            taskNameOptions={taskNameOptions}
            assigneeOptions={assigneeOptions}
            budgetOptions={budgetOptions}
            locationSearch={locationSearch}
            locationSuggestions={locationSuggestions}
            locationDisplay={locationDisplay}
            selectedAddress={taskAddress}
            onLocationSearchChange={handleLocationSearchChange}
            onLocationSuggestionSelect={handleLocationSuggestionSelect}
            onOk={saveTask}
            onCancel={() => setIsTaskModalOpen(false)}
          />

          <CommentModal
            open={isCommentModalOpen}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onSave={saveComment}
            onCancel={() => setIsCommentModalOpen(false)}
          />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TasksComponent;
