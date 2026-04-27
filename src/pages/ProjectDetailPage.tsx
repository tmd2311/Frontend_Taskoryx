import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography, Button, Tabs, Table, Tag, Space, Input, Select, Badge,
  Avatar, Empty, Tooltip, Modal, Form, Popconfirm, message, Spin,
  DatePicker, Card, Progress, List, Timeline, Row, Col, Alert, Statistic,
} from 'antd';
import {
  CheckSquareOutlined, TeamOutlined, ExclamationCircleOutlined,
  UserOutlined, CommentOutlined, PaperClipOutlined, SearchOutlined, ReloadOutlined,
  UserAddOutlined, DeleteOutlined, PlusOutlined,
  ThunderboltOutlined, AppstoreAddOutlined, HistoryOutlined,
  PlayCircleOutlined, CheckCircleOutlined, EditOutlined,
  DownloadOutlined, TableOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useAdminStore } from '../stores/adminStore';
import { projectService } from '../services/projectService';
import { sprintService } from '../services/sprintService';
import { taskService } from '../services/taskService';
import { categoryService } from '../services/categoryService';
import { activityService } from '../services/activityService';
import { searchService } from '../services/searchService';
import { useAuthStore } from '../stores/authStore';
import type {
  TaskSummary, ProjectMember, Sprint, IssueCategory, ActivityLog, GanttTask,
  CreateTaskRequest,
} from '../types';
import { TaskPriority, ProjectRole, TaskStatus, SprintStatus } from '../types';
import StatusSelect from '../components/StatusSelect';
import SprintKanbanView from '../components/SprintKanbanView';
import dayjs from 'dayjs';

const { TextArea } = Input;

const { Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green', [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange', [TaskPriority.URGENT]: 'red',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp', [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao', [TaskPriority.URGENT]: 'Khẩn cấp',
};
// Fallback khi chưa tải được roles từ API
const DEFAULT_ROLE_OPTIONS = [
  { label: 'Quản lý', value: ProjectRole.MANAGER },
  { label: 'Lập trình viên', value: ProjectRole.DEVELOPER },
  { label: 'Người xem', value: ProjectRole.VIEWER },
];
const TASK_STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: TaskStatus.TODO,        label: 'Cần làm',        color: '#8c8c8c' },
  { status: TaskStatus.IN_PROGRESS, label: 'Đang làm',       color: '#1890ff' },
  { status: TaskStatus.IN_REVIEW,   label: 'Đang review',    color: '#fa8c16' },
  { status: TaskStatus.RESOLVED,    label: 'Đã giải quyết',  color: '#722ed1' },
  { status: TaskStatus.DONE,        label: 'Hoàn thành',     color: '#52c41a' },
  { status: TaskStatus.CANCELLED,   label: 'Đã hủy',         color: '#f5222d' },
];

const SPRINT_STATUS_COLOR: Record<string, string> = {
  PLANNED: 'default', ACTIVE: 'blue', COMPLETED: 'green', CANCELLED: 'red',
};
const SPRINT_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Kế hoạch', ACTIVE: 'Đang chạy', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
// ─── Task columns ────────────────────────────────────────────
const buildTaskColumns = (onRowClick?: (r: TaskSummary) => void): ColumnsType<TaskSummary> => [
  {
    title: 'Mã', dataIndex: 'taskKey', key: 'taskKey', width: 110,
    render: (key: string) => <Tag style={{ fontFamily: 'monospace' }}>{key}</Tag>,
  },
  {
    title: 'Tiêu đề', dataIndex: 'title', key: 'title',
    render: (title: string, r) => (
      <Button type="link" style={{ padding: 0, textAlign: 'left', height: 'auto', fontWeight: 400 }}
        onClick={() => onRowClick?.(r)}>{title}</Button>
    ),
  },
  {
    title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 120,
    render: (p: string) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p] ?? p}</Tag>,
  },
  {
    title: 'Người thực hiện', dataIndex: 'assigneeName', key: 'assigneeName', width: 150,
    render: (name?: string) => name
      ? <Space size={6}><Avatar size={24} icon={<UserOutlined />} /><Text style={{ fontSize: 13 }}>{name}</Text></Space>
      : <Text type="secondary">—</Text>,
  },
  {
    title: 'Hạn chót', dataIndex: 'dueDate', key: 'dueDate', width: 130,
    render: (date: string, record) => {
      if (!date) return <Text type="secondary">—</Text>;
      return (
        <Space size={4}>
          {record.overdue && <Tooltip title="Quá hạn"><ExclamationCircleOutlined style={{ color: '#f5222d' }} /></Tooltip>}
          <Text style={{ color: record.overdue ? '#f5222d' : undefined, fontSize: 13 }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      );
    },
  },
  {
    title: '', key: 'meta', width: 80,
    render: (_: any, record) => (
      <Space size={8}>
        {record.commentCount > 0 && (
          <Tooltip title={`${record.commentCount} bình luận`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}><CommentOutlined /> {record.commentCount}</span>
          </Tooltip>
        )}
        {record.attachmentCount > 0 && (
          <Tooltip title={`${record.attachmentCount} tệp đính kèm`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}><PaperClipOutlined /> {record.attachmentCount}</span>
          </Tooltip>
        )}
      </Space>
    ),
  },
];

// ─── ProjectDetailPage ───────────────────────────────────────
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { currentProject, members, fetchProjectById, fetchMembers, deleteProject } = useProjectStore();
  const {
    projectTasks, isLoading, fetchProjectTasks,
  } = useTaskStore();
  const { isAdmin } = useAuthStore();
  const { roles: systemRoles, fetchRoles } = useAdminStore();
  // Roles cho project member — ưu tiên từ API, fallback về hardcoded nếu chưa tải
  const projectRoleOptions = systemRoles.length > 0
    ? systemRoles
        .filter((r) => r.name !== 'OWNER')
        .map((r) => ({ label: r.name, value: r.name }))
    : DEFAULT_ROLE_OPTIONS;

  // Task list filters
  const [keyword, setKeyword] = useState('');
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterOverdue, setFilterOverdue] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'tasks');

  // Members
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addSaving, setAddSaving] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<string>('');
  const [memberSearchResults, setMemberSearchResults] = useState<{ label: React.ReactNode; value: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const memberSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete project
  const [deleting, setDeleting] = useState(false);


  // Sprints
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [sprintForm] = Form.useForm();
  const [sprintSaving, setSprintSaving] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});
  // key để force remount SprintKanbanView khi cần reload
  const [kanbanKeys, setKanbanKeys] = useState<Record<string, number>>({});
  // Create task in sprint modal
  const [createTaskSprintId, setCreateTaskSprintId] = useState<string | null>(null);
  const [createTaskForm] = Form.useForm();
  const [creatingTask, setCreatingTask] = useState(false);
  // Complete sprint flow
  const [completeSprintId, setCompleteSprintId] = useState<string | null>(null);
  const [incompleteTasksForSprint, setIncompleteTasksForSprint] = useState<TaskSummary[]>([]);
  const [completeSprintLoading, setCompleteSprintLoading] = useState(false);
  // Categories
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<IssueCategory | null>(null);
  const [catForm] = Form.useForm();
  const [catSaving, setCatSaving] = useState(false);

  // Activity
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);

  // Gantt
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [ganttError, setGanttError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId);
    fetchMembers(projectId);
    if (systemRoles.length === 0) fetchRoles().catch(() => {});
  }, [projectId]);

  // Sync currentProject vào store khi load trực tiếp qua URL
  const { setCurrentProject } = useProjectStore();
  useEffect(() => {
    if (currentProject?.id === projectId) return;
    if (currentProject && currentProject.id !== projectId) {
      setCurrentProject(null);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const params: any = { page: page - 1, size: PAGE_SIZE };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filterPriority.length) params.priorities = filterPriority.join(',');
    if (filterOverdue !== undefined) params.overdue = filterOverdue;
    fetchProjectTasks(projectId, params);
  }, [projectId, page, keyword, filterPriority, filterOverdue]);

  // Fetch sprints
  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    setSprintsLoading(true);
    try {
      const data = await sprintService.getSprints(projectId);
      setSprints(data);
    } catch { /* ignore */ } finally {
      setSprintsLoading(false);
    }
  }, [projectId]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!projectId) return;
    setCatsLoading(true);
    try {
      const data = await categoryService.getCategories(projectId);
      setCategories(data);
    } catch { /* ignore */ } finally {
      setCatsLoading(false);
    }
  }, [projectId]);

  // Fetch activity
  const fetchActivity = useCallback(async (pg = 0) => {
    if (!projectId) return;
    setActivityLoading(true);
    try {
      const data = await activityService.getProjectActivity(projectId, { page: pg, size: 20 });
      setActivity(data.content ?? []);
      setActivityTotal(data.totalElements ?? 0);
      setActivityPage(pg);
    } catch { /* ignore */ } finally {
      setActivityLoading(false);
    }
  }, [projectId]);

  // Fetch gantt
  const fetchGantt = useCallback(async () => {
    if (!projectId) return;
    setGanttLoading(true);
    setGanttError(null);
    try {
      const data = await taskService.getGantt(projectId);
      setGanttTasks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setGanttError(e.message || 'Không thể tải dữ liệu Gantt');
    } finally {
      setGanttLoading(false);
    }
  }, [projectId]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    navigate(`?tab=${key}`, { replace: true });
    if (key === 'sprints') fetchSprints();
    if (key === 'categories') fetchCategories();
    if (key === 'activity') fetchActivity(0);
    if (key === 'gantt') fetchGantt();
  };

  // ── Members ──────────────────────────────────────────────
  const handleMemberSearch = (keyword: string) => {
    if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current);
    if (!keyword.trim()) { setMemberSearchResults([]); return; }
    setMemberSearchLoading(true);
    memberSearchTimer.current = setTimeout(async () => {
      try {
        const result = await searchService.searchUsers({ keyword: keyword.trim(), page: 0, size: 10 });
        const opts = (result.content ?? []).map((u) => ({
          value: u.email,
          label: (
            <Space size={8}>
              <Avatar src={u.avatarUrl} icon={<UserOutlined />} size={24} />
              <span style={{ fontWeight: 500 }}>{u.fullName || u.username}</span>
              <span style={{ color: '#8c9ab0', fontSize: 12 }}>{u.email}</span>
            </Space>
          ),
        }));
        setMemberSearchResults(opts);
      } catch {
        setMemberSearchResults([]);
      } finally {
        setMemberSearchLoading(false);
      }
    }, 300);
  };

  const handleAddMember = async (values: { email: string; role: string }) => {
    if (!projectId) return;
    setAddSaving(true);
    try {
      await projectService.addMember(projectId, { email: values.email.trim(), role: values.role as any });
      message.success('Đã thêm thành viên vào dự án');
      setAddModalOpen(false);
      addForm.resetFields();
      setMemberSearchResults([]);
      fetchMembers(projectId);
    } catch (e: any) {
      message.error(e.message || 'Thêm thành viên thất bại');
    } finally {
      setAddSaving(false);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    if (!projectId) return;
    setRoleUpdating(userId);
    try {
      await projectService.updateMemberRole(projectId, userId, { role: role as any });
      message.success('Đã cập nhật vai trò');
      fetchMembers(projectId);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật vai trò thất bại');
    } finally {
      setRoleUpdating('');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!projectId) return;
    try {
      await projectService.removeMember(projectId, userId);
      message.success(`Đã xóa ${name} khỏi dự án`);
      fetchMembers(projectId);
    } catch (e: any) {
      message.error(e.message || 'Xóa thành viên thất bại');
    }
  };

  // ── Sprints ───────────────────────────────────────────────
  const handleSaveSprint = async (values: any) => {
    if (!projectId) return;
    setSprintSaving(true);
    try {
      const payload = {
        name: values.name,
        goal: values.goal,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
      };
      if (editSprint) {
        await sprintService.update(editSprint.id, payload);
        message.success('Đã cập nhật sprint');
      } else {
        await sprintService.create(projectId, payload);
        message.success('Đã tạo sprint');
      }
      setSprintModal(false);
      sprintForm.resetFields();
      setEditSprint(null);
      fetchSprints();
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setSprintSaving(false);
    }
  };

  const handleStartSprint = async (id: string) => {
    try {
      await sprintService.start(id);
      message.success('Đã bắt đầu sprint');
      fetchSprints();
    } catch (e: any) {
      message.error(e.message || 'Bắt đầu thất bại');
    }
  };

  const handleDeleteSprint = async (id: string) => {
    try {
      await sprintService.delete(id);
      message.success('Đã xóa sprint');
      fetchSprints();
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  // Reload kanban của sprint bằng cách tăng key
  const refreshKanban = (sprintId: string) => {
    setKanbanKeys(prev => ({ ...prev, [sprintId]: (prev[sprintId] ?? 0) + 1 }));
  };

  // Tạo task mới trực tiếp vào sprint
  const handleCreateTaskInSprint = async (values: any) => {
    if (!createTaskSprintId || !projectId) return;
    setCreatingTask(true);
    try {
      const payload: CreateTaskRequest = {
        title: values.title,
        description: values.description,
        priority: values.priority ?? TaskPriority.MEDIUM,
        status: values.status ?? TaskStatus.TODO,
        sprintId: createTaskSprintId,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      };
      await taskService.createTask(projectId, payload);
      message.success('Đã tạo task và thêm vào sprint');
      createTaskForm.resetFields();
      const sid = createTaskSprintId;
      setCreateTaskSprintId(null);
      refreshKanban(sid);
      fetchSprints();
    } catch (e: any) {
      message.error(e.message || 'Tạo task thất bại');
    } finally {
      setCreatingTask(false);
    }
  };

  // Hoàn thành sprint – kiểm tra task chưa xong (load từ API)
  const handleCompleteSprint = async (sprint: Sprint) => {
    if (!projectId) return;
    try {
      const page = await taskService.getTasksBySprint(projectId, sprint.id);
      const flatten = (tasks: TaskSummary[]): TaskSummary[] =>
        tasks.flatMap(t => [t, ...flatten(t.subTasks ?? [])]);
      const all = flatten(page.content ?? []);
      const incomplete = all.filter(
        (t) => !['DONE', 'RESOLVED', 'CANCELLED'].includes(t.status)
      );
      if (incomplete.length > 0) {
        setCompleteSprintId(sprint.id);
        setIncompleteTasksForSprint(incomplete);
        return;
      }
    } catch { /* ignore */ }
    // Không có task chưa xong → complete luôn
    await doCompleteSprint(sprint.id);
  };

  const doCompleteSprint = async (id: string) => {
    setCompleteSprintLoading(true);
    try {
      await sprintService.complete(id);
      message.success('Đã hoàn thành sprint');
      setCompleteSprintId(null);
      setIncompleteTasksForSprint([]);
      fetchSprints();
    } catch (e: any) {
      message.error(e.message || 'Hoàn thành thất bại');
    } finally {
      setCompleteSprintLoading(false);
    }
  };

  // Gỡ tất cả task chưa xong khỏi sprint rồi complete
  const handleCompleteAndMoveTasks = async () => {
    if (!completeSprintId) return;
    setCompleteSprintLoading(true);
    try {
      await Promise.all(
        incompleteTasksForSprint.map((t) =>
          sprintService.removeTask(completeSprintId, t.id)
        )
      );
      await doCompleteSprint(completeSprintId);
    } catch (e: any) {
      message.error(e.message || 'Thất bại');
      setCompleteSprintLoading(false);
    }
  };

  // ── Categories ────────────────────────────────────────────
  const handleSaveCategory = async (values: any) => {
    if (!projectId) return;
    setCatSaving(true);
    try {
      if (editCat) {
        await categoryService.update(editCat.id, { name: values.name });
        message.success('Đã cập nhật danh mục');
      } else {
        await categoryService.create(projectId, { name: values.name });
        message.success('Đã tạo danh mục');
      }
      setCatModal(false);
      catForm.resetFields();
      setEditCat(null);
      fetchCategories();
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoryService.delete(id);
      message.success('Đã xóa danh mục');
      fetchCategories();
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  // ── Export ────────────────────────────────────────────────
  const handleExport = () => {
    if (!projectId) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const token = localStorage.getItem('accessToken');
    window.open(`${baseUrl}/export/projects/${projectId}/tasks/excel?token=${token}`, '_blank');
  };

  const tasks = projectTasks?.content ?? [];
  const total = projectTasks?.totalElements ?? 0;
  const project = currentProject?.id === projectId ? currentProject : null;
  const canDelete = isAdmin || project?.currentUserRole === ProjectRole.OWNER;

  // Set currentProject vào store sau khi fetch xong (hỗ trợ truy cập URL trực tiếp)
  useEffect(() => {
    if (currentProject && currentProject.id === projectId) {
      setCurrentProject(currentProject);
    }
  }, [currentProject?.id, projectId]);

  // ── Member columns ────────────────────────────────────────
  const buildMemberColumns = (): ColumnsType<ProjectMember> => [
    {
      title: 'Thành viên', key: 'user',
      render: (_, m) => (
        <Space>
          <Avatar src={m.avatarUrl} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{m.fullName || m.username}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{m.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Vai trò', dataIndex: 'role', key: 'role', width: 180,
      render: (role: string, m) => {
        if (role === ProjectRole.OWNER) return <Tag color="gold">Quản trị viên</Tag>;
        return (
          <Select size="small" value={role} loading={roleUpdating === m.userId}
            style={{ width: 150 }} options={projectRoleOptions}
            onChange={(v) => handleChangeRole(m.userId, v)} />
        );
      },
    },
    {
      title: 'Tham gia', dataIndex: 'joinedAt', key: 'joinedAt', width: 130,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{d ? dayjs(d).format('DD/MM/YYYY') : '—'}</Text>,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_, m) => {
        if (m.role === ProjectRole.OWNER) return null;
        return (
          <Popconfirm title={`Xóa ${m.fullName || m.username} khỏi dự án?`}
            onConfirm={() => handleRemoveMember(m.userId, m.fullName || m.username)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Tooltip title="Xóa khỏi dự án">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      {/* Sub-header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <Space size={8}>
          {project?.description && (
            <Text type="secondary" style={{ fontSize: 13 }}>{project.description}</Text>
          )}
        </Space>
        <Space size={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CheckSquareOutlined /> {project?.taskCount ?? total} task &nbsp;·&nbsp;
            <TeamOutlined /> {project?.memberCount ?? members.length} thành viên
          </Text>
          <Tooltip title="Xuất Excel">
            <Button icon={<DownloadOutlined />} size="small" onClick={handleExport}>Export</Button>
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title="Xóa dự án này?" description="Hành động này không thể hoàn tác."
              onConfirm={async () => {
                setDeleting(true);
                try {
                  await deleteProject(projectId!);
                  message.success('Đã xóa dự án');
                  navigate('/projects', { replace: true });
                } catch (e: any) {
                  setDeleting(false);
                  message.error(e.message || 'Xóa thất bại');
                }
              }}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true, loading: deleting }}
            >
              <Button danger icon={<DeleteOutlined />} size="small" loading={deleting}>Xóa dự án</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          // ─────── CÔNG VIỆC ───────
          {
            key: 'tasks',
            label: <Space><CheckSquareOutlined />Công việc<Badge count={total} color="#1890ff" /></Space>,
            children: (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Input prefix={<SearchOutlined />} placeholder="Tìm kiếm task..." allowClear
                    style={{ flex: '1 1 160px', minWidth: 140 }}
                    onPressEnter={(e) => { setKeyword((e.target as HTMLInputElement).value); setPage(1); }}
                    onChange={(e) => !e.target.value && (setKeyword(''), setPage(1))}
                    onBlur={(e) => { setKeyword(e.target.value); setPage(1); }}
                  />
                  <Select mode="multiple" placeholder="Lọc ưu tiên" allowClear
                    style={{ flex: '1 1 160px', minWidth: 140 }} value={filterPriority}
                    onChange={(v) => { setFilterPriority(v); setPage(1); }}
                    options={[
                      { label: 'Thấp', value: TaskPriority.LOW },
                      { label: 'Trung bình', value: TaskPriority.MEDIUM },
                      { label: 'Cao', value: TaskPriority.HIGH },
                      { label: 'Khẩn cấp', value: TaskPriority.URGENT },
                    ]}
                  />
                  <Select placeholder="Trạng thái hạn" allowClear style={{ flex: '1 1 130px', minWidth: 120 }}
                    value={filterOverdue}
                    onChange={(v) => { setFilterOverdue(v); setPage(1); }}
                    options={[{ label: 'Quá hạn', value: true }, { label: 'Còn hạn', value: false }]}
                  />
                  <Tooltip title="Làm mới">
                    <Button icon={<ReloadOutlined />} onClick={() => {
                      setPage(1);
                      fetchProjectTasks(projectId!, { page: 0, size: PAGE_SIZE });
                    }} loading={isLoading} />
                  </Tooltip>
                </div>
                <Table
                  columns={buildTaskColumns((r) => navigate(`/tasks/${r.taskKey}`))}
                  dataSource={tasks}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{
                    current: page, pageSize: PAGE_SIZE, total,
                    onChange: (p) => setPage(p),
                    showTotal: (t) => `Tổng ${t} task`,
                    showSizeChanger: false,
                  }}
                  locale={{ emptyText: <Empty description="Không có task nào" /> }}
                  rowClassName={(record) => record.overdue ? 'row-overdue' : ''}
                  scroll={{ x: 700 }}
                />
              </>
            ),
          },

          // ─────── THÀNH VIÊN ───────
          {
            key: 'members',
            label: <Space><TeamOutlined />Thành viên<Badge count={members.length} color="#52c41a" /></Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<UserAddOutlined />}
                    onClick={() => { addForm.resetFields(); setAddModalOpen(true); }}>
                    Thêm thành viên
                  </Button>
                </div>
                <Table columns={buildMemberColumns()} dataSource={members} rowKey="id"
                  pagination={false} scroll={{ x: 'max-content' }} locale={{ emptyText: <Empty description="Không có thành viên" /> }} />
              </>
            ),
          },

          // ─────── SPRINTS ───────
          {
            key: 'sprints',
            label: <Space><ThunderboltOutlined />Sprints<Badge count={sprints.filter(s => s.status === SprintStatus.ACTIVE).length} color="blue" /></Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text type="secondary">{sprints.length} sprint</Text>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { sprintForm.resetFields(); setEditSprint(null); setSprintModal(true); }}>
                    Tạo Sprint
                  </Button>
                </div>
                {sprintsLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : sprints.length === 0 ? (
                  <Empty description="Chưa có sprint nào" style={{ padding: '40px 0' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {sprints.map((sprint) => {
                      const isActive = sprint.status === SprintStatus.ACTIVE;
                      const isCompleted = sprint.status === SprintStatus.COMPLETED;
                      const expanded = expandedSprints[sprint.id];
                      const total = sprint.taskCount ?? 0;
                      const completed = sprint.completedTaskCount ?? 0;
                      const pct = total > 0 ? Math.round(completed / total * 100) : 0;
                      const isOverdue = isActive && sprint.endDate && dayjs().isAfter(dayjs(sprint.endDate));

                      return (
                        <Card key={sprint.id} size="small"
                          style={{
                            borderLeft: `4px solid ${isActive ? '#1890ff' : isCompleted ? '#52c41a' : '#d9d9d9'}`,
                            boxShadow: isActive ? '0 2px 12px rgba(24,144,255,.15)' : '0 1px 4px rgba(0,0,0,.06)',
                          }}
                          styles={{ body: { padding: isActive ? '0' : undefined } }}
                        >
                          {/* Banner ACTIVE sprint */}
                          {isActive && (
                            <div style={{ background: 'linear-gradient(90deg,#1890ff 0%,#096dd9 100%)', padding: '8px 16px', borderRadius: '0 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Space>
                                <PlayCircleOutlined style={{ color: '#fff', fontSize: 14 }} />
                                <Text strong style={{ color: '#fff', fontSize: 13 }}>SPRINT ĐANG CHẠY</Text>
                                {isOverdue && <Tag color="red" style={{ margin: 0 }}>Quá hạn!</Tag>}
                              </Space>
                              <Space>
                                {sprint.startDate && <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 12 }}>{dayjs(sprint.startDate).format('DD/MM')} → {sprint.endDate ? dayjs(sprint.endDate).format('DD/MM/YYYY') : '?'}</Text>}
                              </Space>
                            </div>
                          )}

                          <div style={{ padding: '12px 16px' }}>
                            {/* Sprint name + actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 15, flex: 1 }}>{sprint.name}</Text>
                              {!isActive && (
                                <Tag color={SPRINT_STATUS_COLOR[sprint.status]} style={{ marginRight: 0 }}>{SPRINT_STATUS_LABEL[sprint.status]}</Tag>
                              )}
                              {sprint.boardName && <Tag icon={<AppstoreAddOutlined />} style={{ margin: 0 }}>{sprint.boardName}</Tag>}
                              <Space size={4}>
                                {sprint.status === SprintStatus.PLANNED && (
                                  <Popconfirm title="Bắt đầu sprint này?" onConfirm={() => handleStartSprint(sprint.id)} okText="Bắt đầu" cancelText="Hủy">
                                    <Button size="small" type="primary" icon={<PlayCircleOutlined />}>Bắt đầu</Button>
                                  </Popconfirm>
                                )}
                                {isActive && (
                                  <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleCompleteSprint(sprint)}>Hoàn thành Sprint</Button>
                                )}
                                {!isCompleted && (
                                  <Button size="small" icon={<PlusOutlined />} type="primary" ghost
                                    onClick={() => { createTaskForm.resetFields(); setCreateTaskSprintId(sprint.id); }}>
                                    Thêm task
                                  </Button>
                                )}
                                <Button size="small" icon={<EditOutlined />}
                                  onClick={() => {
                                    setEditSprint(sprint);
                                    sprintForm.setFieldsValue({
                                      name: sprint.name, goal: sprint.goal,
                                      startDate: sprint.startDate ? dayjs(sprint.startDate) : null,
                                      endDate: sprint.endDate ? dayjs(sprint.endDate) : null,
                                    });
                                    setSprintModal(true);
                                  }} />
                                {sprint.status === SprintStatus.PLANNED && (
                                  <Popconfirm title="Xóa sprint này?" onConfirm={() => handleDeleteSprint(sprint.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                )}
                              </Space>
                            </div>

                            {/* Sprint Goal */}
                            {sprint.goal && (
                              <Alert
                                message={<Text style={{ fontSize: 12 }}><Text strong style={{ fontSize: 12 }}>Sprint Goal: </Text>{sprint.goal}</Text>}
                                type={isActive ? 'info' : 'success'}
                                showIcon={false}
                                style={{ marginBottom: 10, padding: '6px 12px' }}
                              />
                            )}

                            {/* Stats + Progress */}
                            {total > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <Row gutter={16} style={{ marginBottom: 8 }}>
                                  <Col span={6}>
                                    <Statistic title="Tổng" value={total} valueStyle={{ fontSize: 18 }} />
                                  </Col>
                                  <Col span={6}>
                                    <Statistic title="Chưa xong" value={total - completed} valueStyle={{ fontSize: 18, color: '#8c8c8c' }} />
                                  </Col>
                                  <Col span={6}>
                                    <Statistic title="Tiến độ" value={`${pct}%`} valueStyle={{ fontSize: 18, color: '#1890ff' }} />
                                  </Col>
                                  <Col span={6}>
                                    <Statistic title="Hoàn thành" value={completed} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
                                  </Col>
                                </Row>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Progress
                                    percent={pct}
                                    size="small"
                                    strokeColor={pct === 100 ? '#52c41a' : isActive ? '#1890ff' : '#d9d9d9'}
                                    style={{ flex: 1, margin: 0 }}
                                  />
                                  <Text style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? '#52c41a' : '#1890ff', minWidth: 36 }}>{pct}%</Text>
                                </div>
                              </div>
                            )}

                            {/* Dates (non-active sprints) */}
                            {!isActive && (sprint.startDate || sprint.endDate) && (
                              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                                {sprint.startDate && `${dayjs(sprint.startDate).format('DD/MM/YYYY')}`}
                                {sprint.startDate && sprint.endDate && ' → '}
                                {sprint.endDate && `${dayjs(sprint.endDate).format('DD/MM/YYYY')}`}
                              </div>
                            )}

                            {/* Toggle danh sách task */}
                            <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}
                              onClick={() => setExpandedSprints(prev => ({ ...prev, [sprint.id]: !prev[sprint.id] }))}>
                              {expanded ? '▲ Ẩn task' : `▼ Xem task${total > 0 ? ` (${total})` : ''}`}
                            </Button>

                            {/* Kanban board với kéo thả */}
                            {expanded && (
                              <SprintKanbanView
                                key={`${sprint.id}-${kanbanKeys[sprint.id] ?? 0}`}
                                projectId={projectId!}
                                sprintId={sprint.id}
                                allSprints={sprints}
                                onOpenTask={(taskKey) => navigate(`/tasks/${taskKey}`)}
                                onRefreshStats={() => fetchSprints()}
                              />
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Modal tạo task mới trong sprint */}
                <Modal
                  title={<Space><PlusOutlined />Tạo task trong Sprint: <Text strong>{sprints.find(s => s.id === createTaskSprintId)?.name}</Text></Space>}
                  open={!!createTaskSprintId}
                  onCancel={() => { setCreateTaskSprintId(null); createTaskForm.resetFields(); }}
                  onOk={() => createTaskForm.submit()}
                  okText="Tạo task"
                  cancelText="Hủy"
                  okButtonProps={{ loading: creatingTask }}
                  width={520}
                  destroyOnHidden
                >
                  <Form form={createTaskForm} layout="vertical" onFinish={handleCreateTaskInSprint} style={{ marginTop: 8 }}>
                    <Form.Item
                      name="title"
                      label="Tiêu đề"
                      rules={[
                        { required: true, message: 'Vui lòng nhập tiêu đề!' },
                        { max: 500, message: 'Tối đa 500 ký tự' },
                        { whitespace: true, message: 'Tiêu đề không được chỉ có khoảng trắng' },
                      ]}
                    >
                      <Input placeholder="Tiêu đề task" autoFocus maxLength={500} />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                      <TextArea rows={2} placeholder="Mô tả chi tiết (tùy chọn)" maxLength={5000} />
                    </Form.Item>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="status" label="Trạng thái / Cột" initialValue={TaskStatus.TODO}>
                          <Select options={TASK_STATUS_COLUMNS.map(c => ({
                            label: <Space size={6}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />{c.label}</Space>,
                            value: c.status,
                          }))} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="priority" label="Ưu tiên" initialValue={TaskPriority.MEDIUM}>
                          <Select options={[
                            { label: <Tag color="green">Thấp</Tag>, value: TaskPriority.LOW },
                            { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
                            { label: <Tag color="orange">Cao</Tag>, value: TaskPriority.HIGH },
                            { label: <Tag color="red">Khẩn cấp</Tag>, value: TaskPriority.URGENT },
                          ]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="dueDate" label="Hạn chót">
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Form>
                </Modal>

                {/* Modal xử lý task chưa xong khi complete sprint */}
                <Modal
                  title={<Space><ExclamationCircleOutlined style={{ color: '#faad14' }} />Hoàn thành Sprint</Space>}
                  open={!!completeSprintId}
                  onCancel={() => { setCompleteSprintId(null); setIncompleteTasksForSprint([]); }}
                  footer={
                    <Space>
                      <Button onClick={() => { setCompleteSprintId(null); setIncompleteTasksForSprint([]); }}>Hủy</Button>
                      <Button danger loading={completeSprintLoading} onClick={handleCompleteAndMoveTasks}>
                        Gỡ task & Hoàn thành
                      </Button>
                      <Button type="primary" loading={completeSprintLoading}
                        onClick={() => completeSprintId && doCompleteSprint(completeSprintId)}>
                        Hoàn thành (giữ task trong sprint)
                      </Button>
                    </Space>
                  }
                  destroyOnHidden
                >
                  <p>
                    Sprint có <Text strong style={{ color: '#faad14' }}>{incompleteTasksForSprint.length} task chưa hoàn thành</Text>:
                  </p>
                  <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {incompleteTasksForSprint.map((t) => (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', background: '#fffbe6', borderRadius: 4,
                      }}>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{t.taskKey}</Tag>
                        <Text style={{ flex: 1, fontSize: 13 }}>{t.title}</Text>
                        <Tag color={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</Tag>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, color: '#8c8c8c', fontSize: 13 }}>
                    <b>Gỡ task & Hoàn thành</b>: Các task chưa xong sẽ bị gỡ khỏi sprint.<br/>
                    <b>Hoàn thành (giữ)</b>: Các task vẫn nằm trong sprint đã hoàn thành.
                  </div>
                </Modal>
              </>
            ),
          },

          // ─────── CATEGORIES ───────
          {
            key: 'categories',
            label: <Space><AppstoreAddOutlined />Danh mục</Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text type="secondary">{categories.length} danh mục</Text>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { catForm.resetFields(); setEditCat(null); setCatModal(true); }}>
                    Thêm danh mục
                  </Button>
                </div>
                {catsLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : categories.length === 0 ? (
                  <Empty description="Chưa có danh mục nào" style={{ padding: '40px 0' }} />
                ) : (
                  <List
                    dataSource={categories}
                    renderItem={(cat) => (
                      <List.Item
                        actions={[
                          <Button key="edit" size="small" icon={<EditOutlined />}
                            onClick={() => {
                              setEditCat(cat);
                              catForm.setFieldsValue({ name: cat.name });
                              setCatModal(true);
                            }} />,
                          <Popconfirm key="del" title="Xóa danh mục này?"
                            onConfirm={() => handleDeleteCategory(cat.id)}
                            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<AppstoreAddOutlined />} style={{ background: '#722ed1' }} />}
                          title={<Text strong>{cat.name}</Text>}
                          description={cat.defaultAssigneeName && `Mặc định: ${cat.defaultAssigneeName}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </>
            ),
          },

          // ─────── ACTIVITY ───────
          {
            key: 'activity',
            label: <Space><HistoryOutlined />Hoạt động</Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text type="secondary">Lịch sử hoạt động dự án</Text>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchActivity(0)} loading={activityLoading}>
                    Làm mới
                  </Button>
                </div>
                {activityLoading && activity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : activity.length === 0 ? (
                  <Empty description="Chưa có hoạt động nào" style={{ padding: '40px 0' }} />
                ) : (
                  <Timeline
                    items={activity.map((a) => ({
                      key: a.id,
                      dot: <Avatar size={24} src={a.userAvatar} icon={<UserOutlined />} />,
                      children: (
                        <div style={{ paddingBottom: 8 }}>
                          <Space size={6}>
                            <Text strong style={{ fontSize: 13 }}>{a.userFullName || a.username}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(a.createdAt).fromNow()}</Text>
                          </Space>
                          <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{a.description}</div>
                        </div>
                      ),
                    }))}
                  />
                )}
                {activityTotal > activity.length && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Button onClick={() => fetchActivity(activityPage + 1)}>Xem thêm</Button>
                  </div>
                )}
              </>
            ),
          },

          // ─────── GANTT ───────
          {
            key: 'gantt',
            label: <Space><TableOutlined />Gantt</Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text type="secondary">Tasks có ngày bắt đầu hoặc deadline</Text>
                  <Button size="small" icon={<ReloadOutlined />} onClick={fetchGantt} loading={ganttLoading}>
                    Làm mới
                  </Button>
                </div>
                {ganttLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : ganttError ? (
                  <Empty description={<span style={{ color: '#f5222d' }}>{ganttError}</span>} style={{ padding: '40px 0' }} />
                ) : ganttTasks.length === 0 ? (
                  <Empty description="Không có task nào có ngày bắt đầu hoặc deadline" style={{ padding: '40px 0' }} />
                ) : (
                  <Table
                    dataSource={ganttTasks}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 800 }}
                    columns={[
                      {
                        title: 'Mã', dataIndex: 'taskKey', width: 110,
                        render: (k) => <Tag style={{ fontFamily: 'monospace' }}>{k}</Tag>,
                      },
                      {
                        title: 'Tiêu đề', dataIndex: 'title',
                        render: (t, r) => (
                          <Button type="link" style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                            onClick={() => navigate(`/tasks/${r.taskKey}`)}>{t}</Button>
                        ),
                      },
                      {
                        title: 'Ưu tiên', dataIndex: 'priority', width: 110,
                        render: (p) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p]}</Tag>,
                      },
                      {
                        title: 'Assignee', dataIndex: 'assigneeName', width: 140,
                        render: (n) => n ? <Space size={6}><Avatar size={20} icon={<UserOutlined />} />{n}</Space> : <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Bắt đầu', dataIndex: 'startDate', width: 120,
                        render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Deadline', dataIndex: 'dueDate', width: 120,
                        render: (d, r) => d
                          ? <Text style={{ color: r.completedAt ? undefined : (dayjs(d).isBefore(dayjs()) ? '#f5222d' : undefined) }}>
                              {dayjs(d).format('DD/MM/YYYY')}
                            </Text>
                          : <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Tiến độ', key: 'timeline', width: 200,
                        render: (_, r) => {
                          if (!r.startDate && !r.dueDate) return null;
                          const start = r.startDate ? dayjs(r.startDate) : dayjs();
                          const end = r.dueDate ? dayjs(r.dueDate) : dayjs();
                          const total = end.diff(start, 'day') || 1;
                          const elapsed = dayjs().diff(start, 'day');
                          const pct = Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
                          return (
                            <Progress percent={pct} size="small"
                              strokeColor={r.completedAt ? '#52c41a' : (pct > 100 ? '#f5222d' : '#1890ff')} />
                          );
                        },
                      },
                    ]}
                  />
                )}
              </>
            ),
          },
        ]}
      />


      {/* Modal thêm thành viên */}
      <Modal title={<Space><UserAddOutlined />Thêm thành viên</Space>}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); setMemberSearchResults([]); }}
        footer={null} destroyOnHidden>
        <Form form={addForm} layout="vertical" onFinish={handleAddMember} style={{ marginTop: 8 }}
          initialValues={{ role: ProjectRole.DEVELOPER }}>
          <Form.Item name="email" label="Tìm kiếm người dùng"
            rules={[{ required: true, message: 'Vui lòng chọn người dùng!' }]}>
            <Select
              size="large"
              showSearch
              filterOption={false}
              placeholder="Nhập tên, email hoặc username..."
              notFoundContent={memberSearchLoading ? <Spin size="small" /> : 'Không tìm thấy người dùng'}
              onSearch={handleMemberSearch}
              options={memberSearchResults}
              allowClear
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select size="large" options={projectRoleOptions} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={addSaving}>Thêm vào dự án</Button>
            <Button onClick={() => { setAddModalOpen(false); addForm.resetFields(); setMemberSearchResults([]); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal Sprint */}
      <Modal
        title={<Space><ThunderboltOutlined />{editSprint ? 'Sửa Sprint' : 'Tạo Sprint'}</Space>}
        open={sprintModal} onCancel={() => { setSprintModal(false); setEditSprint(null); }}
        footer={null} destroyOnHidden>
        <Form form={sprintForm} layout="vertical" onFinish={handleSaveSprint} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên Sprint" rules={[{ required: true, message: 'Vui lòng nhập tên sprint' }]}>
            <Input placeholder="VD: Sprint 1" />
          </Form.Item>
          <Form.Item name="goal" label="Mục tiêu Sprint">
            <Input.TextArea rows={2} placeholder="Mục tiêu cần đạt trong sprint này..." />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" htmlType="submit" loading={sprintSaving}>{editSprint ? 'Cập nhật' : 'Tạo Sprint'}</Button>
            <Button onClick={() => { setSprintModal(false); setEditSprint(null); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal Category */}
      <Modal
        title={<Space><AppstoreAddOutlined />{editCat ? 'Sửa danh mục' : 'Thêm danh mục'}</Space>}
        open={catModal} onCancel={() => { setCatModal(false); setEditCat(null); }}
        footer={null} destroyOnHidden>
        <Form form={catForm} layout="vertical" onFinish={handleSaveCategory} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Bug, Feature, Improvement..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={catSaving}>{editCat ? 'Cập nhật' : 'Thêm'}</Button>
            <Button onClick={() => { setCatModal(false); setEditCat(null); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      <style>{`
        .row-overdue td { background: #fff2f0 !important; }
      `}</style>
    </div>
  );
};

export default ProjectDetailPage;
