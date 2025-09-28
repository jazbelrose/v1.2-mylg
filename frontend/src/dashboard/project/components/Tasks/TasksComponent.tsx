import React, { useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  ConfigProvider,
  DatePicker,
  Drawer,
  Dropdown,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  DownOutlined,
} from "@ant-design/icons";
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
import LeafletMap from "@/shared/ui/Map";
import "./task-table.css";

type Status = "todo" | "in_progress" | "done";

interface TeamMember {
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  email?: string;
}

interface TaskLocation {
  lat: number | string;
  lng: number | string;
}

interface ApiTask {
  taskId?: string;
  id?: string;
  projectId: string;
  title?: string;
  name?: string;
  description?: string;
  comments?: string;
  budgetItemId?: string | null;
  status?: "todo" | "in_progress" | "done";
  assigneeId?: string;
  assignedTo?: string;
  dueDate?: string;
  location?: TaskLocation | null;
  address?: string;
}

interface Task {
  id: string;
  taskId?: string;
  projectId: string;
  name: string;
  assigneeId?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: string;
  budgetItemId?: string;
  eventId?: string;
  description?: string;
  status: Status;
  location?: TaskLocation | null;
  address?: string;
}

interface NominatimSuggestion {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

interface TasksComponentProps {
  projectId?: string;
  userId?: string;
  team?: TeamMember[];
}

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const DEFAULT_LOCATION = { lat: 40.7128, lng: -74.006 };

const TasksComponent: React.FC<TasksComponentProps> = ({
  projectId = "",
  team = [],
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState("");

  const [editForm] = Form.useForm();
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    NominatimSuggestion[]
  >([]);
  const [taskLocation, setTaskLocation] = useState<TaskLocation>({
    lat: "",
    lng: "",
  });
  const [taskAddress, setTaskAddress] = useState("");

  const [mapSearch, setMapSearch] = useState("");
  const [mapSuggestions, setMapSuggestions] = useState<NominatimSuggestion[]>(
    []
  );
  const [drawerMapAddress, setDrawerMapAddress] = useState("");
  const [drawerMapLocation, setDrawerMapLocation] = useState(DEFAULT_LOCATION);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setUserLocation(null)
      );
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      setDrawerMapLocation(userLocation);
    }
  }, [userLocation]);

  const sortByProximity = (
    suggestions: NominatimSuggestion[],
    userLoc: { lat: number; lng: number } | null
  ) => {
    if (!userLoc) return suggestions;
    return [...suggestions].sort((a, b) => {
      const distA = Math.hypot(
        userLoc.lat - parseFloat(a.lat),
        userLoc.lng - parseFloat(a.lon)
      );
      const distB = Math.hypot(
        userLoc.lat - parseFloat(b.lat),
        userLoc.lng - parseFloat(b.lon)
      );
      return distA - distB;
    });
  };

  const requestLocationSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      return [];
    }
    try {
      const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(
        query
      )}&addressdetails=1&limit=5`;
      const response = await apiFetch(url);
      return (response as NominatimSuggestion[]) || [];
    } catch {
      return [];
    }
  };

  const handleMapSearchChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setMapSearch(value);
    if (!value || value.length < 3) {
      setMapSuggestions([]);
      return;
    }
    const results = await requestLocationSuggestions(value);
    setMapSuggestions(sortByProximity(results, userLocation));
  };

  const handleMapSuggestionSelect = (s: NominatimSuggestion) => {
    const loc = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setDrawerMapLocation(loc);
    setDrawerMapAddress(s.display_name);
    setMapSearch(s.display_name);
    setMapSuggestions([]);
  };

  const handleLocationSearchChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setLocationSearch(value);
    if (!value || value.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    const results = await requestLocationSuggestions(value);
    setLocationSuggestions(results);
  };

  const handleLocationSuggestionSelect = (s: NominatimSuggestion) => {
    const loc = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setTaskLocation(loc);
    setTaskAddress(s.display_name);
    setLocationSearch(s.display_name);
    setLocationSuggestions([]);
    editForm.setFieldsValue({ address: s.display_name });
  };

  const { budgetItems } = useBudget();
  const [teamProfiles, setTeamProfiles] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (Array.isArray(team) && team.length > 0) {
        const userIds = team.map((m) => m.userId).filter(Boolean);
        const profiles = await fetchUserProfilesBatch(userIds);
        setTeamProfiles(profiles || []);
      } else {
        setTeamProfiles([]);
      }
    };
    fetchProfiles();
  }, [team]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks(projectId);
        const mapped: Task[] = (data || []).map((t: ApiTask) => ({
          ...t,
          id: t.taskId || t.id || uuidv4(),
          projectId: t.projectId,
          name: (t.title || t.name || "").toUpperCase(),
          status: (t.status as Status) || "todo",
          assigneeId: t.assigneeId || t.assignedTo,
          description: t.description || t.comments,
        }));
        setTasks(mapped);
      } catch (err) {
        console.error("Failed to fetch tasks", err);
        setTasks([]);
      }
    };
    if (projectId) {
      loadTasks();
    }
  }, [projectId]);

  const getDisplayName = (m: Partial<TeamMember> = {}) => {
    const first = m.firstName || "";
    const last = m.lastName || "";
    const name = `${first} ${last}`.trim();
    return name || m.displayName || m.username || m.userId || "";
  };

  const assigneeOptions =
    Array.isArray(teamProfiles) && teamProfiles.length > 0
      ? teamProfiles.map((p) => ({
          value: `${(p.firstName || "")}${(p.lastName || "")}__${p.userId}`,
          label: getDisplayName(p) || p.userId!,
        }))
      : [];

  const budgetOptions = budgetItems.map((it: Record<string, unknown>) => {
    const desc = (it.descriptionShort || it.description || "").toString().slice(0, 50);
    return {
      value: (it.budgetItemId as string) || "",
      label: `${(it.elementId as string) || ""} (${desc})`,
      elementId: (it.elementId as string) || "",
    };
  });

  const taskNameOptions = budgetItems.map((it: Record<string, unknown>) => {
    const labelBase = ((it.descriptionShort || it.description || "") as string)
      .split(" ")
      .slice(0, 6)
      .join(" ");
    return { label: labelBase, value: labelBase, elementId: (it.elementId as string) || "" };
  });

  const uniqueTaskNameOptions = Array.from(
    taskNameOptions.reduce<Map<string, (typeof taskNameOptions)[number]>>(
      (map, opt) => {
        if (!map.has(opt.value)) map.set(opt.value, opt);
        return map;
      },
      new Map()
    ).values()
  );

  const toNumericLocation = (loc?: TaskLocation | null) => {
    if (!loc) return null;
    const lat = typeof loc.lat === "string" ? parseFloat(loc.lat) : loc.lat;
    const lng = typeof loc.lng === "string" ? parseFloat(loc.lng) : loc.lng;
    if (typeof lat !== "number" || Number.isNaN(lat)) return null;
    if (typeof lng !== "number" || Number.isNaN(lng)) return null;
    return { lat, lng };
  };

  const upcomingTasks = useMemo(() => {
    if (!tasks.length) return [];
    const withDue = tasks
      .filter((t) => t.dueDate)
      .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));
    const withoutDue = tasks.filter((t) => !t.dueDate);
    return [...withDue, ...withoutDue].slice(0, 3);
  }, [tasks]);

  const openTaskModal = (task?: Task) => {
    const t = task || null;
    setEditingTask(t);
    setIsTaskModalOpen(true);

    editForm.setFieldsValue(
      t || {
        name: "",
        assignedTo: "",
        dueDate: "",
        priority: "",
        budgetItemId: "",
        eventId: "",
        address: "",
      }
    );

    const numericLoc = toNumericLocation(t?.location);
    setTaskLocation(
      numericLoc || {
        lat: "",
        lng: "",
      }
    );
    setTaskAddress(t?.address || "");
    setLocationSearch(t?.address || "");
    setLocationSuggestions([]);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    editForm.resetFields();
    setTaskLocation({ lat: "", lng: "" });
    setTaskAddress("");
    setLocationSearch("");
    setLocationSuggestions([]);
  };

  const saveTask = async () => {
    try {
      const values = await editForm.validateFields();
      const id = editingTask?.taskId || editingTask?.id || uuidv4();
      const normalizedName = (values.name || "").toUpperCase();
      const due: Dayjs | string | undefined = values.dueDate;
      const numericLocation = toNumericLocation(taskLocation);

      const payload = {
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
        location: numericLocation || editingTask?.location || null,
        address: taskAddress || locationSearch || editingTask?.address || "",
      };

      const saved = editingTask ? await updateTask(payload) : await createTask(payload);
      const mapped: Task = {
        ...saved,
        id: saved.taskId || id,
        projectId: saved.projectId,
        name: saved.title || "",
        status: saved.status || "todo",
      };

      setTasks((prev) => {
        const exists = prev.find((t) => t.id === mapped.id);
        return exists
          ? prev.map((t) => (t.id === mapped.id ? { ...t, ...mapped } : t))
          : [...prev, mapped];
      });

      closeTaskModal();
    } catch (err) {
      console.error("Failed to save task", err);
      message.error("Failed to save task");
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    const normalized = (status || "todo").toLowerCase().replace(/\s+/g, "_") as Status;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: normalized } : t)));
  };

  const openCommentModal = (task: Task) => {
    setCommentTask(task);
    setCommentText(task.description || "");
    setIsCommentModalOpen(true);
  };

  const saveComment = () => {
    if (!commentTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === commentTask.id ? { ...t, description: commentText } : t))
    );
    setIsCommentModalOpen(false);
    setCommentTask(null);
  };

  const handleMenuClick =
    (task: Task): MenuProps["onClick"] =>
    async ({ key }) => {
      if (key === "edit") {
        openTaskModal(task);
        return;
      }
      if (key === "delete") {
        const previousTasks = tasks;
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        try {
          await deleteTask({
            projectId: task.projectId,
            taskId: task.taskId || task.id,
          });
        } catch (err) {
          console.error("Failed to delete task", err);
          setTasks(previousTasks);
          message.error("Failed to delete task");
        }
      }
    };

  const focusTaskOnMap = (task?: Task) => {
    const numeric = toNumericLocation(task?.location);
    if (numeric) {
      setDrawerMapLocation(numeric);
      setDrawerMapAddress(task?.address || task?.name || "");
    }
  };

  const resolvedDrawerMapAddress = drawerMapAddress || "Search for a location";
  const resolvedModalLocation = useMemo(() => {
    const numeric = toNumericLocation(taskLocation);
    if (numeric) return numeric;
    if (editingTask) {
      const fromTask = toNumericLocation(editingTask.location);
      if (fromTask) return fromTask;
    }
    if (userLocation) return userLocation;
    return DEFAULT_LOCATION;
  }, [taskLocation, editingTask, userLocation]);

  const resolvedModalAddress = taskAddress || locationSearch || editingTask?.address || "";

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
      render: (text?: string) => {
        if (text && text.includes("__")) {
          const [name] = text.split("__");
          return name.replace(/([a-z])([A-Z])/g, "$1 $2");
        }
        return text;
      },
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 110,
      ellipsis: true,
      render: (value?: string) => (value ? dayjs(value).format("MMM D, YYYY") : ""),
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
          options={statusOptions}
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

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="tasks-component">
        <Card
          className="tasks-component__card"
          size="small"
          title={<Typography.Title level={5}>Upcoming Tasks</Typography.Title>}
          extra={
            <Space size={8}>
              <Button type="primary" size="small" onClick={() => openTaskModal()}>
                Create
              </Button>
              <Button size="small" onClick={() => setIsDrawerOpen(true)}>
                View All
              </Button>
            </Space>
          }
          bodyStyle={{ padding: "12px 16px" }}
        >
          <List
            dataSource={upcomingTasks}
            locale={{
              emptyText: (
                <Typography.Text type="secondary">No upcoming tasks</Typography.Text>
              ),
            }}
            renderItem={(item) => {
              const statusLabel =
                statusOptions.find((opt) => opt.value === item.status)?.label || "To Do";
              return (
                <List.Item
                  className="tasks-component__list-item"
                  onClick={() => {
                    focusTaskOnMap(item);
                    setIsDrawerOpen(true);
                  }}
                >
                  <div className="tasks-component__list-item-content">
                    <div className="tasks-component__list-item-title">{item.name}</div>
                    <div className="tasks-component__list-item-meta">
                      <Typography.Text type="secondary">
                        {item.dueDate ? dayjs(item.dueDate).format("MMM D") : "No due date"}
                      </Typography.Text>
                      <span className={`tasks-component__status tasks-component__status--${item.status}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </Card>

        <Drawer
          title="Tasks"
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          placement={isMobile ? "bottom" : "right"}
          height={isMobile ? "100dvh" : undefined}
          width={isMobile ? "100%" : 880}
          destroyOnClose
          maskClosable
          bodyStyle={{ padding: 0, height: "100%" }}
        >
          <div className="tasks-component__drawer-body">
            <div className="tasks-component__drawer-main">
              <div className="tasks-component__drawer-table">
                <div className="tasks-component__drawer-header">
                  <Typography.Title level={5}>All Tasks</Typography.Title>
                  <Button type="primary" size="small" onClick={() => openTaskModal()}>
                    Create Task
                  </Button>
                </div>
                <div className="tasks-component__drawer-table-scroll">
                  <Table<Task>
                    rowKey="id"
                    columns={columns}
                    dataSource={tasks}
                    pagination={false}
                    size="small"
                    tableLayout="fixed"
                    className="tasks-table custom-sticky-scrollbar"
                    scroll={{ x: "max-content", y: isMobile ? 240 : 360 }}
                    locale={{ emptyText: "No tasks yet!" }}
                    sticky={{ offsetHeader: 0, offsetScroll: 0 }}
                    style={{ fontSize: "11px" }}
                    onRow={(record) => ({
                      onClick: () => focusTaskOnMap(record),
                    })}
                  />
                </div>
              </div>

              {isDrawerOpen && (
                <div className="tasks-component__drawer-map">
                  <Typography.Title level={5}>Task Locations</Typography.Title>
                  <div className="tasks-component__map-search">
                    <Input
                      placeholder="Search for a location"
                      value={mapSearch}
                      onChange={handleMapSearchChange}
                      allowClear
                    />
                    {mapSuggestions.length > 0 && (
                      <div className="tasks-component__suggestions" role="list">
                        {mapSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            className="tasks-component__suggestion-item"
                            onClick={() => handleMapSuggestionSelect(s)}
                          >
                            {s.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tasks-component__drawer-map-view">
                  <LeafletMap
                    location={drawerMapLocation}
                    address={resolvedDrawerMapAddress}
                    scrollWheelZoom={!isMobile}
                    dragging
                    touchZoom
                    showUserLocation={Boolean(userLocation)}
                  />
                  </div>
                  <Typography.Text type="secondary" className="tasks-component__map-address">
                    {resolvedDrawerMapAddress}
                  </Typography.Text>
                </div>
              )}
            </div>
          </div>
        </Drawer>

        <Modal
          title={editingTask ? "Edit Task" : "Create Task"}
          open={isTaskModalOpen}
          onOk={saveTask}
          onCancel={closeTaskModal}
          centered
          okButtonProps={{ style: { background: "#FA3356", borderColor: "#FA3356" } }}
          forceRender
          width={isMobile ? "100%" : 600}
          styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        >
          <Form layout="vertical" form={editForm} preserve={false}>
            <Form.Item
              label="Task"
              name="name"
              rules={[{ required: true, message: "Task name required" }]}
            >
              <AutoComplete
                options={uniqueTaskNameOptions}
                listHeight={160}
                placeholder="Enter or select task"
                filterOption={(inputValue, option) =>
                  (option?.value as string)
                    ?.toUpperCase()
                    .includes(inputValue.toUpperCase())
                }
              />
            </Form.Item>

            <Form.Item label="Assignee" name="assignedTo">
              <Select size="small" options={assigneeOptions} allowClear />
            </Form.Item>

            <Form.Item label="Due Date" name="dueDate">
              <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Priority" name="priority">
              <Input placeholder="Priority" />
            </Form.Item>

            <Form.Item label="Budget Code" name="budgetItemId">
              <Select options={budgetOptions} showSearch allowClear />
            </Form.Item>

            <Form.Item label="Event ID" name="eventId">
              <Input placeholder="Event ID" />
            </Form.Item>

            <div className="tasks-component__modal-location">
              <Typography.Title level={5}>Location</Typography.Title>
              <Input
                placeholder="Search address"
                value={locationSearch}
                onChange={handleLocationSearchChange}
                autoComplete="off"
              />
              {locationSuggestions.length > 0 && (
                <div className="tasks-component__suggestions" role="list">
                  {locationSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      className="tasks-component__suggestion-item"
                      onClick={() => handleLocationSuggestionSelect(s)}
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {resolvedModalAddress && (
                <Typography.Text type="secondary" className="tasks-component__map-address">
                  {resolvedModalAddress}
                </Typography.Text>
              )}
              <div className="tasks-component__modal-map">
                <LeafletMap
                  location={resolvedModalLocation}
                  address={resolvedModalAddress || "Select a location"}
                  scrollWheelZoom={!isMobile}
                  dragging
                  touchZoom
                  showUserLocation={Boolean(userLocation)}
                  isEditable={false}
                />
              </div>
            </div>
          </Form>
        </Modal>

        <Modal
          title="Edit Comment"
          open={isCommentModalOpen}
          onOk={saveComment}
          onCancel={() => setIsCommentModalOpen(false)}
          centered
          okButtonProps={{ style: { background: "#FA3356", borderColor: "#FA3356" } }}
        >
          <Input.TextArea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={4}
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default TasksComponent;
