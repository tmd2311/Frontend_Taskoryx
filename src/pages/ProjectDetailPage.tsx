import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography, Button, Table, Tag, Space, Input, Select, InputNumber,
  Avatar, Empty, Tooltip, Modal, Form, Popconfirm, message, Spin,
  DatePicker, Card, Progress, List, Row, Col, Alert, Statistic, Badge, ColorPicker, theme,
} from 'antd';
import {
  CheckSquareOutlined, TeamOutlined, ExclamationCircleOutlined,
  UserOutlined, CommentOutlined, PaperClipOutlined, ReloadOutlined,
  UserAddOutlined, DeleteOutlined, PlusOutlined, ApartmentOutlined,
  ThunderboltOutlined, AppstoreAddOutlined,
  PlayCircleOutlined, CheckCircleOutlined, EditOutlined,
  DownloadOutlined, RightOutlined, DownOutlined, HistoryOutlined,
  WarningOutlined, RiseOutlined, CalendarOutlined, LinkOutlined,
  BarChartOutlined, TagOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { resolveAvatarUrl } from '../utils/avatar';
import type { TableColumnsType } from 'antd';
type ColumnsType<T> = TableColumnsType<T>;
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useAdminStore } from '../stores/adminStore';
import { projectService } from '../services/projectService';
import { sprintService } from '../services/sprintService';
import { taskService } from '../services/taskService';
import { categoryService } from '../services/categoryService';
import { versionService } from '../services/versionService';
import { activityService } from '../services/activityService';
import { searchService } from '../services/searchService';
import { useAuthStore } from '../stores/authStore';
import type {
  TaskSummary, ProjectMember, Sprint, IssueCategory, ActivityLog, GanttTask,
  CreateTaskRequest, TaskFilterState, Version, ProjectStatsResponse,
  TaskAlertItem, MemberTaskStats, Label,
} from '../types';
import { TaskPriority, ProjectRole, TaskStatus, SprintStatus } from '../types';
import SprintKanbanView from '../components/SprintKanbanView';
import TaskFilterPanel, { DEFAULT_FILTER } from '../components/TaskFilterPanel';
import BoardTab from './tabs/BoardTab';
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

// ─── Activity constants ───────────────────────────────────────
const ACT_LABEL: Record<string, string> = {
  CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Đã xóa',
  MOVE: 'Di chuyển', ASSIGN: 'Phân công', COMPLETE: 'Hoàn thành',
};
const ACT_COLOR: Record<string, string> = {
  CREATE: '#10b981', UPDATE: '#4361ee', DELETE: '#ef4444',
  MOVE: '#f59e0b', ASSIGN: '#8b5cf6', COMPLETE: '#06b6d4',
};
const ACT_BG: Record<string, string> = {
  CREATE: 'rgba(16,185,129,0.08)', UPDATE: 'rgba(67,97,238,0.08)', DELETE: 'rgba(239,68,68,0.08)',
  MOVE: 'rgba(245,158,11,0.08)', ASSIGN: 'rgba(139,92,246,0.08)', COMPLETE: 'rgba(6,182,212,0.08)',
};
const ENTITY_LABEL: Record<string, string> = {
  TASK: 'Task', COMMENT: 'Bình luận', PROJECT: 'Dự án',
  BOARD: 'Board', COLUMN: 'Cột', ATTACHMENT: 'Tệp đính kèm',
};

const TASK_STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: TaskStatus.TODO, label: 'Cần làm', color: '#8c8c8c' },
  { status: TaskStatus.IN_PROGRESS, label: 'Đang làm', color: '#1890ff' },
  { status: TaskStatus.IN_REVIEW, label: 'Đang review', color: '#fa8c16' },
  { status: TaskStatus.RESOLVED, label: 'Đã giải quyết', color: '#722ed1' },
  { status: TaskStatus.DONE, label: 'Hoàn thành', color: '#52c41a' },
  { status: TaskStatus.CANCELLED, label: 'Đã hủy', color: '#f5222d' },
];

const SPRINT_STATUS_COLOR: Record<string, string> = {
  PLANNED: 'default', ACTIVE: 'blue', COMPLETED: 'green', CANCELLED: 'red',
};
const SPRINT_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Kế hoạch', ACTIVE: 'Đang chạy', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
// ─── Flatten cây đệ quy theo expandedKeys ────────────────────
function flattenTree(
  nodes: TaskSummary[],
  expandedKeys: Set<string>,
  depth = 0,
): TaskSummary[] {
  return nodes.flatMap(node => {
    const withDepth = { ...node, depth };
    const hasChildren = (node.subTasks?.length ?? 0) > 0;
    if (hasChildren && expandedKeys.has(node.id)) {
      return [withDepth, ...flattenTree(node.subTasks!, expandedKeys, depth + 1)];
    }
    return [withDepth];
  });
}

// ─── Task columns ────────────────────────────────────────────
const buildTaskColumns = (
  onRowClick: (r: TaskSummary) => void,
  expandedKeys: Set<string>,
  onToggleExpand: (id: string) => void,
): ColumnsType<TaskSummary> => [
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
    render: (_: string, r: TaskSummary) => {
      const hasChildren = (r.subTasks?.length ?? 0) > 0;
      const expanded = expandedKeys.has(r.id);
      const depth = r.depth ?? 0;
      const doneCount = r.subTasks?.filter((s: TaskSummary) => s.status === 'DONE').length ?? 0;
      const totalSub = r.subTasks?.length ?? 0;

      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingLeft: depth * 24 }}>
          {/* Expand / leaf icon */}
          {hasChildren ? (
            <span
              onClick={(e) => { e.stopPropagation(); onToggleExpand(r.id); }}
              style={{ cursor: 'pointer', color: '#4361ee', fontSize: 11, marginTop: 3, flexShrink: 0, width: 16, textAlign: 'center' }}
            >
              {expanded ? <DownOutlined /> : <RightOutlined />}
            </span>
          ) : (
            <span style={{ width: 16, flexShrink: 0, marginTop: 3, textAlign: 'center', color: '#d9d9d9', fontSize: 8 }}>●</span>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Button
                type="link"
                style={{
                  padding: 0, height: 'auto', textAlign: 'left',
                  fontWeight: hasChildren ? 600 : 400,
                  fontSize: depth === 0 ? 13 : 12,
                  color: depth === 0 ? undefined : '#595959',
                }}
                onClick={() => onRowClick(r)}
              >
                {r.title}
              </Button>
              {hasChildren && (
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {totalSub} việc con
                </Text>
              )}
            </div>
            {hasChildren && (
              <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Progress
                  percent={totalSub > 0 ? Math.round((doneCount / totalSub) * 100) : 0}
                  size="small"
                  style={{ width: 80, margin: 0 }}
                  showInfo={false}
                  strokeColor="#52c41a"
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{doneCount}/{totalSub} xong</Text>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    title: 'Mã', dataIndex: 'taskKey', key: 'taskKey', width: 100,
    render: (key: string, r: TaskSummary) => (
      <Tag style={{ fontFamily: 'monospace', opacity: (r.depth ?? 0) > 0 ? 0.75 : 1 }}>{key}</Tag>
    ),
  },
  {
    title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 110,
    render: (p: string, r: TaskSummary) => (
      <Tag color={PRIORITY_COLOR[p]} style={{ opacity: (r.depth ?? 0) > 0 ? 0.85 : 1 }}>
        {PRIORITY_LABEL[p] ?? p}
      </Tag>
    ),
  },
  {
    title: 'Người thực hiện', dataIndex: 'assigneeName', key: 'assigneeName', width: 150,
    render: (name?: string, r?: TaskSummary) => name
      ? (
        <Space size={6}>
          <Avatar src={r?.assigneeAvatar} size={22} icon={<UserOutlined />} />
          <Text style={{ fontSize: 12 }}>{name}</Text>
        </Space>
      )
      : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
  },
  {
    title: 'Hạn chót', dataIndex: 'dueDate', key: 'dueDate', width: 120,
    render: (date: string, record: TaskSummary) => {
      if (!date) return <Text type="secondary">—</Text>;
      return (
        <Space size={4}>
          {record.overdue && <Tooltip title="Quá hạn"><ExclamationCircleOutlined style={{ color: '#f5222d' }} /></Tooltip>}
          <Text style={{ color: record.overdue ? '#f5222d' : undefined, fontSize: 12 }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      );
    },
  },
  {
    title: '', key: 'meta', width: 70,
    render: (_: any, record: TaskSummary) => (
      <Space size={8}>
        {(record.commentCount ?? 0) > 0 && (
          <Tooltip title={`${record.commentCount} bình luận`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}><CommentOutlined /> {record.commentCount}</span>
          </Tooltip>
        )}
        {(record.attachmentCount ?? 0) > 0 && (
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
  const { token } = theme.useToken();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { currentProject, members, fetchProjectById, fetchMembers, deleteProject, setForbiddenTab, clearForbiddenTabs } = useProjectStore();
  const {
    projectTasks, isLoading, fetchProjectTasks,
  } = useTaskStore();
  const { isAdmin, user: currentUser } = useAuthStore();
  const { fetchRoles } = useAdminStore();

  // Task list filters (unified state)
  const [taskFilter, setTaskFilter] = useState<TaskFilterState>(DEFAULT_FILTER);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = DEFAULT_FILTER.pageSize;

  // Versions (milestone) for filter
  const [versions, setVersions] = useState<Version[]>([]);

  // Derived shorthand
  const page = taskFilter.page;
  const activeTab = searchParams.get('tab') || 'tasks';

  // Members
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addSaving, setAddSaving] = useState(false);

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
  // Create task from tab tasks
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createTaskTabForm] = Form.useForm();
  const [creatingTaskTab, setCreatingTaskTab] = useState(false);
  const [tabTaskSprints, setTabTaskSprints] = useState<Sprint[]>([]);
  const [tabSprintsLoading, setTabSprintsLoading] = useState(false);
  const [parentCandidates, setParentCandidates] = useState<import('../types').TaskSummary[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
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

  // Labels
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelModal, setLabelModal] = useState(false);
  const [labelForm] = Form.useForm();
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelColor, setLabelColor] = useState<string>('#1890ff');

  // Activity
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);

  // Gantt
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [ganttError, setGanttError] = useState<string | null>(null);

  // Stats
  const [projectStats, setProjectStats] = useState<ProjectStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // taskFields từ project config — dùng để render form tạo task động
  const taskFields = currentProject?.projectConfig?.taskFields ?? [];
  const isFieldRequired = (field: string) => taskFields.includes(field);

  useEffect(() => {
    if (!projectId) return;
    clearForbiddenTabs();
    fetchProjectById(projectId);
    fetchMembers(projectId);
    fetchRoles().catch(() => { });
    // Load master data cho filter panel
    categoryService.getCategories(projectId).then(setCategories).catch(() => {});
    versionService.getVersions(projectId).then(setVersions).catch(() => {});
    sprintService.getSprints(projectId).then(setSprints).catch(() => {});
  }, [projectId]);

  // Sync currentProject vào store khi load trực tiếp qua URL
  const { setCurrentProject } = useProjectStore();
  useEffect(() => {
    if (currentProject?.id === projectId) return;
    if (currentProject && currentProject.id !== projectId) {
      setCurrentProject(null);
    }
  }, [projectId]);

  const buildTaskParams = useCallback((f: TaskFilterState) => {
    const params: any = { page: f.page - 1, size: PAGE_SIZE };
    if (f.keyword.trim()) params.keyword = f.keyword.trim();
    if (f.priorities.length) params.priorities = f.priorities.join(',');
    if (f.assigneeId) params.assigneeId = f.assigneeId;
    if (f.categoryId) params.categoryId = f.categoryId;
    if (f.versionId) params.versionId = f.versionId;
    if (f.sprintId) params.sprintId = f.sprintId;
    if (f.status && f.status !== 'all') params.status = f.status;
    if (f.subtasking && f.subtasking !== 'all') params.subtasking = f.subtasking;
    return params;
  }, [PAGE_SIZE]);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectTasks(projectId, buildTaskParams(taskFilter));
  }, [projectId, taskFilter, buildTaskParams]);

  // Fetch sprints
  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    setSprintsLoading(true);
    try {
      const data = await sprintService.getSprints(projectId);
      setSprints(data);
    } catch (e: any) {
      if (e?.status === 403) setForbiddenTab('sprints');
    } finally {
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
    } catch (e: any) {
      if (e?.status === 403) setForbiddenTab('categories');
    } finally {
      setCatsLoading(false);
    }
  }, [projectId]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!projectId) return;
    setLabelsLoading(true);
    try {
      const data = await projectService.getLabels(projectId);
      setProjectLabels(data);
    } catch (e: any) {
      if (e?.status === 403) setForbiddenTab('labels');
    } finally {
      setLabelsLoading(false);
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
    } catch (e: any) {
      if (e?.status === 403) setForbiddenTab('activity');
    } finally {
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
      if (e?.status === 403) setForbiddenTab('gantt');
      else setGanttError(e.message || 'Không thể tải dữ liệu Gantt');
    } finally {
      setGanttLoading(false);
    }
  }, [projectId]);

  const fetchStats = useCallback(async () => {
    if (!projectId) return;
    setStatsLoading(true);
    try {
      const data = await projectService.getStats(projectId);
      setProjectStats(data);
    } catch (e: any) {
      if (e?.status === 403) setForbiddenTab('stats');
    } finally {
      setStatsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'sprints') fetchSprints();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'labels') fetchLabels();
    if (activeTab === 'activity') fetchActivity(0);
    if (activeTab === 'gantt') fetchGantt();
    if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

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

  const handleAddMember = async (values: { email: string }) => {
    if (!projectId) return;
    setAddSaving(true);
    try {
      await projectService.addMember(projectId, { email: values.email.trim() });
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
        assigneeId: values.assigneeId || undefined,
        estimatedHours: values.estimatedHours || undefined,
        categoryId: values.categoryId || undefined,
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

  const loadTabSprints = async (projId: string) => {
    setTabSprintsLoading(true);
    try {
      const data = await sprintService.getSprints(projId);
      setTabTaskSprints(Array.isArray(data) ? data.filter(s => s.status !== SprintStatus.COMPLETED) : []);
    } catch { setTabTaskSprints([]); }
    finally { setTabSprintsLoading(false); }
  };

  const loadParentCandidates = async (projId: string) => {
    setParentLoading(true);
    try {
      const candidates = await taskService.getValidParentTasks(projId);
      setParentCandidates(Array.isArray(candidates) ? candidates : []);
    } catch { setParentCandidates([]); }
    finally { setParentLoading(false); }
  };

  const openCreateTaskModal = () => {
    createTaskTabForm.resetFields();
    createTaskTabForm.setFieldsValue({ assigneeId: currentUser?.id });
    setCreateTaskModalOpen(true);
    if (!projectId) return;
    loadTabSprints(projectId);
    loadParentCandidates(projectId);
  };

  const handleCreateTaskFromTab = async (values: any) => {
    if (!projectId) return;
    setCreatingTaskTab(true);
    try {
      const payload: CreateTaskRequest = {
        title: values.title,
        description: values.description,
        priority: values.priority ?? TaskPriority.MEDIUM,
        sprintId: values.sprintId,
        parentTaskId: values.parentTaskId,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        assigneeId: values.assigneeId || undefined,
        estimatedHours: values.estimatedHours || undefined,
        categoryId: values.categoryId || undefined,
      };
      await taskService.createTask(projectId, payload);
      message.success('Đã tạo task');
      createTaskTabForm.resetFields();
      setCreateTaskModalOpen(false);
      fetchProjectTasks(projectId, { page: 0, size: PAGE_SIZE });
    } catch (e: any) {
      message.error(e.message || 'Tạo task thất bại');
    } finally {
      setCreatingTaskTab(false);
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
        const updateData: any = { name: values.name };
        if (values.defaultAssigneeId) {
          updateData.defaultAssigneeId = values.defaultAssigneeId;
        } else {
          updateData.clearDefaultAssignee = true;
        }
        await categoryService.update(editCat.id, updateData);
        message.success('Đã cập nhật danh mục');
      } else {
        await categoryService.create(projectId, {
          name: values.name,
          defaultAssigneeId: values.defaultAssigneeId || undefined,
        });
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

  // ── Labels ────────────────────────────────────────────────
  const handleCreateLabel = async (values: any) => {
    if (!projectId) return;
    setLabelSaving(true);
    try {
      await projectService.createLabel(projectId, {
        name: values.name,
        color: labelColor,
        description: values.description || undefined,
      });
      message.success('Đã tạo nhãn');
      setLabelModal(false);
      labelForm.resetFields();
      setLabelColor('#1890ff');
      fetchLabels();
    } catch (e: any) {
      message.error(e.message || 'Tạo nhãn thất bại');
    } finally {
      setLabelSaving(false);
    }
  };

  const handleDeleteLabel = async (id: string) => {
    try {
      await projectService.deleteLabel(id);
      message.success('Đã xóa nhãn');
      fetchLabels();
    } catch (e: any) {
      message.error(e.message || 'Xóa nhãn thất bại');
    }
  };

  // ── Export ────────────────────────────────────────────────
  const handleExport = () => {
    if (!projectId) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const token = localStorage.getItem('access_token');
    window.open(`${baseUrl}/export/projects/${projectId}/tasks/excel?token=${encodeURIComponent(token ?? '')}`, '_blank');
  };

  const rootTasks = projectTasks?.content ?? [];
  const visibleTasks = flattenTree(rootTasks, expandedTaskIds);
  const total = projectTasks?.totalElements ?? 0;

  const handleToggleExpand = (id: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const project = currentProject?.id === projectId ? currentProject : null;
  const canDelete = isAdmin || project?.currentUserRole === ProjectRole.OWNER;
  const canManageMembers = isAdmin
    || project?.currentUserRole === ProjectRole.OWNER
    || project?.currentUserRole === ProjectRole.MANAGER;

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
      render: (_: unknown, m: ProjectMember) => (
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
      render: (role: string) => {
        const labels: Record<string, string> = {
          OWNER: 'Quản trị viên', MANAGER: 'Quản lý', DEVELOPER: 'Lập trình viên', VIEWER: 'Người xem',
        };
        const colors: Record<string, string> = {
          OWNER: 'gold', MANAGER: 'blue', DEVELOPER: 'green', VIEWER: 'default',
        };
        return <Tag color={colors[role] ?? 'default'}>{labels[role] ?? role}</Tag>;
      },
    },
    {
      title: 'Tham gia', dataIndex: 'joinedAt', key: 'joinedAt', width: 130,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{d ? dayjs(d).format('DD/MM/YYYY') : '—'}</Text>,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, m: ProjectMember) => {
        if (m.role === ProjectRole.OWNER || !canManageMembers) return null;
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

      {/* Nội dung tab — điều hướng qua sidebar trái */}

      {activeTab === 'tasks' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTaskModal}>
              Tạo task
            </Button>
          </div>

          <TaskFilterPanel
            value={taskFilter}
            onChange={(patch) => setTaskFilter((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))}
            onSearch={() => fetchProjectTasks(projectId!, buildTaskParams({ ...taskFilter, page: 1 }))}
            onReset={() => setTaskFilter(DEFAULT_FILTER)}
            loading={isLoading}
            members={members}
            categories={categories}
            versions={versions}
            sprints={sprints}
          />
          <Table
            columns={buildTaskColumns(
              (r) => navigate(`/tasks/${r.taskKey}`),
              expandedTaskIds,
              handleToggleExpand,
            )}
            dataSource={visibleTasks}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page, pageSize: PAGE_SIZE, total,
              onChange: (p) => setTaskFilter((prev) => ({ ...prev, page: p })),
              showTotal: (t) => `Tổng ${t} task`,
              showSizeChanger: false,
            }}
            locale={{ emptyText: <Empty description="Không có task nào" /> }}
            rowClassName={(record) => [
              record.overdue ? 'row-overdue' : '',
              (record.depth ?? 0) > 0 ? 'row-subtask' : '',
            ].filter(Boolean).join(' ')}
            scroll={{ x: 700 }}
          />
        </>
      )}

      {activeTab === 'members' && (
        <>
          {canManageMembers && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button type="primary" icon={<UserAddOutlined />}
                onClick={() => { addForm.resetFields(); setAddModalOpen(true); }}>
                Thêm thành viên
              </Button>
            </div>
          )}
          <Table columns={buildMemberColumns()} dataSource={members} rowKey="id"
            pagination={false} scroll={{ x: 'max-content' }} locale={{ emptyText: <Empty description="Không có thành viên" /> }} />
        </>
      )}

      {activeTab === 'sprints' && (
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
                            <Button size="small" icon={<PlusOutlined />} type="primary"
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
                              <Statistic title="Chưa xong" value={total - completed} valueStyle={{ fontSize: 18, color: token.colorTextSecondary }} />
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
                        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 8 }}>
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
              {categories.length > 0 && (
                <Form.Item name="categoryId" label="Danh mục">
                  <Select
                    allowClear
                    placeholder="Không phân loại"
                    options={categories.map(c => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>
              )}
              <Form.Item
                name="assigneeId"
                label="Người thực hiện"
                rules={[{ required: isFieldRequired('assignee'), message: 'Vui lòng chọn người thực hiện' }]}
              >
                <Select
                  allowClear
                  showSearch
                  placeholder="Chọn người thực hiện"
                  optionFilterProp="label"
                  options={members.map((m) => ({ label: m.fullName || m.username, value: m.userId }))}
                />
              </Form.Item>
              <Form.Item
                name="dueDate"
                label="Hạn chót"
                rules={[{ required: isFieldRequired('dueDate'), message: 'Vui lòng chọn hạn chót' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              {isFieldRequired('estimatedHours') && (
                <Form.Item
                  name="estimatedHours"
                  label="Giờ ước tính"
                  rules={[{ required: true, message: 'Vui lòng nhập số giờ ước tính' }]}
                >
                  <InputNumber min={0.5} max={9999} step={0.5} style={{ width: '100%' }} placeholder="VD: 8" />
                </Form.Item>
              )}
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
                  padding: '6px 10px', background: token.colorFillAlter, borderRadius: 4,
                }}>
                  <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{t.taskKey}</Tag>
                  <Text style={{ flex: 1, fontSize: 13 }}>{t.title}</Text>
                  <Tag color={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</Tag>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, color: token.colorTextSecondary, fontSize: 13 }}>
              <b>Gỡ task & Hoàn thành</b>: Các task chưa xong sẽ bị gỡ khỏi sprint.<br />
              <b>Hoàn thành (giữ)</b>: Các task vẫn nằm trong sprint đã hoàn thành.
            </div>
          </Modal>
        </>
      )}

      {activeTab === 'categories' && (
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
                        catForm.setFieldsValue({ name: cat.name, defaultAssigneeId: cat.defaultAssigneeId });
                        setCatModal(true);
                      }} />,
                    cat.taskCount > 0 ? (
                      <Tooltip key="del" title={`Không thể xóa: danh mục có ${cat.taskCount} task`}>
                        <Button size="small" danger icon={<DeleteOutlined />} disabled />
                      </Tooltip>
                    ) : (
                      <Popconfirm key="del" title="Xóa danh mục này?"
                        onConfirm={() => handleDeleteCategory(cat.id)}
                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<AppstoreAddOutlined />} style={{ background: '#722ed1' }} />}
                    title={
                      <Space size={6}>
                        <Text strong>{cat.name}</Text>
                        {cat.taskCount > 0 && (
                          <Badge count={cat.taskCount} size="small" style={{ background: '#722ed1' }} />
                        )}
                      </Space>
                    }
                    description={cat.defaultAssigneeName && `Mặc định: ${cat.defaultAssigneeName}`}
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}

      {activeTab === 'labels' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text type="secondary">{projectLabels.length} nhãn</Text>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { labelForm.resetFields(); setLabelColor('#1890ff'); setLabelModal(true); }}>
              Thêm nhãn
            </Button>
          </div>
          {labelsLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : projectLabels.length === 0 ? (
            <Empty description="Chưa có nhãn nào" style={{ padding: '40px 0' }} />
          ) : (
            <List
              dataSource={projectLabels}
              renderItem={(lbl) => (
                <List.Item
                  actions={[
                    <Popconfirm key="del" title="Xóa nhãn này?"
                      onConfirm={() => handleDeleteLabel(lbl.id)}
                      okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<TagOutlined />} style={{ background: lbl.color || '#1890ff' }} />}
                    title={<Tag color={lbl.color} style={{ fontSize: 13 }}>{lbl.name}</Tag>}
                    description={lbl.description}
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}

      {activeTab === 'activity' && (
        <div>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(67,97,238,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HistoryOutlined style={{ color: '#4361ee', fontSize: 15 }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Nhật ký hoạt động</div>
                {activityTotal > 0 && (
                  <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 1 }}>
                    {activityTotal} sự kiện được ghi lại
                  </div>
                )}
              </div>
            </div>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchActivity(0)}
              loading={activityLoading}
              style={{ borderRadius: 6 }}
            >
              Làm mới
            </Button>
          </div>

          {/* Body */}
          {activityLoading && activity.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
              <Spin size="large" />
              <Text type="secondary" style={{ fontSize: 13 }}>Đang tải lịch sử…</Text>
            </div>
          ) : activity.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '60px 0', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(67,97,238,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HistoryOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>Chưa có hoạt động nào</Text>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.map((a) => {
                const accentColor = ACT_COLOR[a.action] ?? '#8c8c8c';
                const bgTint = ACT_BG[a.action] ?? 'transparent';
                const parseVal = (v: string | null | undefined): string | null => {
                  if (!v) return null;
                  try {
                    const parsed = JSON.parse(v);
                    return Object.entries(parsed as Record<string, unknown>)
                      .map(([k, val]) => `${k}: ${val}`)
                      .join(' · ');
                  } catch { return v; }
                };
                const oldStr = parseVal(a.oldValue);
                const newStr = parseVal(a.newValue);
                const hasDiff = !!(oldStr || newStr);

                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      gap: 0,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid var(--card-border, #e8eaf0)',
                      background: 'var(--colorBgContainer, #fff)',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Left accent bar */}
                    <div style={{ width: 4, flexShrink: 0, background: accentColor }} />

                    {/* Content */}
                    <div style={{ flex: 1, padding: '10px 14px' }}>
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Avatar
                          size={26}
                          src={resolveAvatarUrl(a.userAvatar)}
                          icon={<UserOutlined />}
                          style={{ flexShrink: 0 }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {a.userFullName || a.username || 'Người dùng'}
                        </span>

                        {/* Action badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                          padding: '1px 7px', borderRadius: 20,
                          color: accentColor, background: bgTint,
                          border: `1px solid ${accentColor}33`,
                          lineHeight: '18px',
                        }}>
                          {ACT_LABEL[a.action] ?? a.action}
                        </span>

                        {/* Entity type chip */}
                        {a.entityType && (
                          <span style={{
                            fontSize: 11, padding: '1px 7px', borderRadius: 20,
                            color: '#595959', background: 'rgba(0,0,0,0.04)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            lineHeight: '18px',
                          }}>
                            {ENTITY_LABEL[a.entityType] ?? a.entityType}
                          </span>
                        )}

                        {/* Timestamp — pushed right */}
                        <span style={{
                          marginLeft: 'auto', fontSize: 11,
                          color: token.colorTextSecondary, whiteSpace: 'nowrap',
                        }}>
                          {dayjs(a.createdAt).fromNow()}
                        </span>
                      </div>

                      {/* Description */}
                      {a.description && (
                        <div style={{ fontSize: 13, color: '#595959', marginTop: 6, lineHeight: 1.5 }}>
                          {a.description}
                        </div>
                      )}

                      {/* Diff block */}
                      {hasDiff && (
                        <div style={{
                          marginTop: 8, borderRadius: 6, overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.07)',
                          fontSize: 11, fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                          lineHeight: 1.7,
                        }}>
                          {oldStr && (
                            <div style={{
                              padding: '3px 10px',
                              background: 'rgba(239,68,68,0.06)',
                              color: '#cf1322',
                              borderBottom: newStr ? '1px solid rgba(0,0,0,0.05)' : undefined,
                            }}>
                              − {oldStr}
                            </div>
                          )}
                          {newStr && (
                            <div style={{
                              padding: '3px 10px',
                              background: 'rgba(16,185,129,0.06)',
                              color: '#389e0d',
                            }}>
                              + {newStr}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {activityTotal > activity.length && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button
                onClick={() => fetchActivity(activityPage + 1)}
                loading={activityLoading}
                style={{ borderRadius: 8, minWidth: 160 }}
              >
                Tải thêm · {activity.length}/{activityTotal}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'gantt' && (
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
                { title: 'Mã', dataIndex: 'taskKey', width: 110, render: (k) => <Tag style={{ fontFamily: 'monospace' }}>{k}</Tag> },
                { title: 'Tiêu đề', dataIndex: 'title', render: (t, r) => <Button type="link" style={{ padding: 0, height: 'auto', textAlign: 'left' }} onClick={() => navigate(`/tasks/${r.taskKey}`)}>{t}</Button> },
                { title: 'Ưu tiên', dataIndex: 'priority', width: 110, render: (p) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p]}</Tag> },
                { title: 'Assignee', dataIndex: 'assigneeName', width: 140, render: (n) => n ? <Space size={6}><Avatar size={20} icon={<UserOutlined />} />{n}</Space> : <Text type="secondary">—</Text> },
                { title: 'Bắt đầu', dataIndex: 'startDate', width: 120, render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : <Text type="secondary">—</Text> },
                { title: 'Deadline', dataIndex: 'dueDate', width: 120, render: (d, r) => d ? <Text style={{ color: r.completedAt ? undefined : (dayjs(d).isBefore(dayjs()) ? '#f5222d' : undefined) }}>{dayjs(d).format('DD/MM/YYYY')}</Text> : <Text type="secondary">—</Text> },
                {
                  title: 'Tiến độ', key: 'timeline', width: 200,
                  render: (_, r) => {
                    if (!r.startDate && !r.dueDate) return null;
                    const start = r.startDate ? dayjs(r.startDate) : dayjs();
                    const end = r.dueDate ? dayjs(r.dueDate) : dayjs();
                    const tot = end.diff(start, 'day') || 1;
                    const elapsed = dayjs().diff(start, 'day');
                    const pct = Math.min(Math.max(Math.round((elapsed / tot) * 100), 0), 100);
                    return <Progress percent={pct} size="small" strokeColor={r.completedAt ? '#52c41a' : (pct > 100 ? '#f5222d' : '#1890ff')} />;
                  },
                },
              ]}
            />
          )}
        </>
      )}


      {activeTab === 'board' && (
        <BoardTab projectId={projectId!} />
      )}

      {/* ── Tab thống kê dự án ── */}
      {activeTab === 'stats' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15 }}>
              <RiseOutlined style={{ marginRight: 6, color: '#4361ee' }} />
              Thống kê dự án
            </Text>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchStats} loading={statsLoading}>Làm mới</Button>
          </div>

          {statsLoading && !projectStats ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
          ) : !projectStats ? (
            <Empty description="Không thể tải thống kê" style={{ padding: '40px 0' }} />
          ) : projectStats.taskOverview.total === 0 ? (
            <Empty description="Dự án chưa có task nào" style={{ padding: '40px 0' }} />
          ) : (() => {
            const { taskOverview: ov, completionTrend, memberStats, activeSprint, overdueTasks, upcomingTasks } = projectStats;

            // Tổng quan
            const overviewItems = [
              { label: 'Cần làm', value: ov.todo, color: '#6b7280' },
              { label: 'Đang làm', value: ov.inProgress, color: '#3b82f6' },
              { label: 'Hoàn thành', value: ov.done + ov.resolved, color: '#10b981' },
              { label: 'Quá hạn', value: ov.overdue, color: '#ef4444' },
            ];

            // Chart data
            const trendData = completionTrend.map((d) => ({
              date: d.date.slice(5),
              'Hoàn thành': d.completed,
              'Tạo mới': d.created,
            }));

            // Priority rows
            const priorityRows = [
              { label: 'Khẩn cấp', value: ov.urgent, color: '#ef4444' },
              { label: 'Cao', value: ov.high, color: '#f97316' },
              { label: 'Trung bình', value: ov.medium, color: '#3b82f6' },
              { label: 'Thấp', value: ov.low, color: '#6b7280' },
            ].filter((r) => r.value > 0);

            // Alert columns
            const alertCols = (type: 'overdue' | 'upcoming'): ColumnsType<TaskAlertItem> => [
              {
                title: 'Task', dataIndex: 'taskKey', width: 100,
                render: (k: string) => (
                  <Tag
                    icon={<LinkOutlined />}
                    style={{ fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${k}`)}
                  >{k}</Tag>
                ),
              },
              { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text> },
              {
                title: 'Ưu tiên', dataIndex: 'priority', width: 110,
                render: (p: string) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p]}</Tag>,
              },
              {
                title: type === 'overdue' ? 'Quá hạn' : 'Còn lại',
                dataIndex: 'daysFromNow', width: 100,
                render: (v: number) => type === 'overdue'
                  ? <Tag color="red">+{v} ngày</Tag>
                  : <Tag color={Math.abs(v) <= 1 ? 'red' : Math.abs(v) <= 3 ? 'orange' : 'gold'}>{Math.abs(v)} ngày</Tag>,
              },
              {
                title: 'Assignee', dataIndex: 'assigneeName', width: 130,
                render: (name: string | null, row: TaskAlertItem) => name
                  ? <Space size={4}><Avatar size={20} icon={<UserOutlined />} src={row.assigneeAvatarUrl ?? undefined} /><Text style={{ fontSize: 12 }}>{name}</Text></Space>
                  : <Text type="secondary" style={{ fontSize: 12 }}>Chưa giao</Text>,
              },
            ];

            const memberCols: ColumnsType<MemberTaskStats> = [
              {
                title: 'Thành viên', dataIndex: 'fullName',
                render: (name: string, row: MemberTaskStats) => (
                  <Space>
                    <Avatar size={26} src={row.avatarUrl ?? undefined} icon={<UserOutlined />} />
                    <Text style={{ fontSize: 13 }}>{name}</Text>
                  </Space>
                ),
              },
              {
                title: 'Tiến độ', dataIndex: 'total', width: 160,
                render: (_: number, row: MemberTaskStats) => (
                  <div>
                    <Progress percent={row.total > 0 ? Math.round((row.done / row.total) * 100) : 0} size="small" strokeColor="#10b981" style={{ marginBottom: 2 }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{row.done}/{row.total} xong</Text>
                  </div>
                ),
              },
              { title: 'Đang làm', dataIndex: 'inProgress', width: 80, align: 'center' as const, render: (v: number) => <Tag color="blue">{v}</Tag> },
              {
                title: 'Quá hạn', dataIndex: 'overdue', width: 80, align: 'center' as const,
                render: (v: number) => v > 0 ? <Badge count={v} style={{ backgroundColor: '#ef4444' }} /> : <Text type="secondary">—</Text>,
              },
            ];

            return (
              <>
                {/* Completion rate + 4 card */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Card style={{ textAlign: 'center', width: '100%' }}>
                      <Progress type="circle" percent={Math.round(ov.completionRate)} strokeColor="#4361ee" size={90} />
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Hoàn thành</Text>
                        <br />
                        <Text strong style={{ fontSize: 12 }}>{ov.total} task</Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={20}>
                    <Row gutter={[10, 10]}>
                      {overviewItems.map((item) => (
                        <Col xs={12} sm={6} key={item.label}>
                          <Card style={{ borderTop: `3px solid ${item.color}` }}>
                            <Statistic title={item.label} value={item.value} valueStyle={{ color: item.color, fontSize: 22 }} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>

                {/* Sprint + Priority */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={14}>
                    {activeSprint ? (
                      <Card
                        title={<Space><ThunderboltOutlined style={{ color: '#4361ee' }} />{activeSprint.sprintName}</Space>}
                        extra={
                          <Tag color={activeSprint.daysRemaining > 3 ? 'success' : activeSprint.daysRemaining >= 1 ? 'warning' : 'error'}>
                            {activeSprint.daysRemaining > 0 ? `Còn ${activeSprint.daysRemaining} ngày` : activeSprint.daysRemaining === 0 ? 'Hết hạn hôm nay' : `Trễ ${Math.abs(activeSprint.daysRemaining)} ngày`}
                          </Tag>
                        }
                        style={{ height: '100%' }}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Tiến độ</Text>
                            <Text strong style={{ color: '#4361ee', fontSize: 13 }}>{activeSprint.doneTasks}/{activeSprint.totalTasks} task</Text>
                          </div>
                          <Progress percent={Math.round(activeSprint.completionRate)} strokeColor="#4361ee" />
                        </div>
                        <Row gutter={8}>
                          {[
                            { label: 'Cần làm', value: activeSprint.todoTasks, color: '#6b7280' },
                            { label: 'Đang làm', value: activeSprint.inProgressTasks, color: '#3b82f6' },
                            { label: 'Xong', value: activeSprint.doneTasks, color: '#10b981' },
                          ].map((s) => (
                            <Col span={8} key={s.label}>
                              <div style={{ textAlign: 'center', padding: '6px 4px', background: token.colorFillAlter, borderRadius: 8 }}>
                                <Text strong style={{ color: s.color, fontSize: 18, display: 'block' }}>{s.value}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                              </div>
                            </Col>
                          ))}
                        </Row>
                        <div style={{ marginTop: 10, fontSize: 12, color: token.colorTextSecondary }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {dayjs(activeSprint.startDate).format('DD/MM')} – {dayjs(activeSprint.endDate).format('DD/MM/YYYY')}
                        </div>
                      </Card>
                    ) : (
                      <Card style={{ height: '100%' }}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có sprint đang chạy" style={{ padding: '20px 0' }} />
                      </Card>
                    )}
                  </Col>
                  <Col xs={24} md={10}>
                    <Card title={<Space><BarChartOutlined style={{ color: '#f59e0b' }} />Phân bổ độ ưu tiên</Space>} style={{ height: '100%' }}>
                      {priorityRows.map((r) => (
                        <div key={r.label} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <Space size={6}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                              <Text style={{ fontSize: 13 }}>{r.label}</Text>
                            </Space>
                            <Text strong style={{ fontSize: 13 }}>{r.value}</Text>
                          </div>
                          <Progress percent={Math.round((r.value / ov.total) * 100)} strokeColor={r.color} showInfo={false} size="small" />
                        </div>
                      ))}
                      {ov.unassigned > 0 && (
                        <div style={{ marginTop: 10, padding: '6px 10px', background: token.colorWarningBg, borderRadius: 6, border: `1px solid ${token.colorWarningBorder}` }}>
                          <Text style={{ fontSize: 12, color: token.colorWarning }}>
                            <WarningOutlined style={{ marginRight: 4 }} />
                            {ov.unassigned} task chưa được phân công
                          </Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* Xu hướng 30 ngày */}
                <Card
                  title={<Space><RiseOutlined style={{ color: '#10b981' }} />Xu hướng hoàn thành (30 ngày gần nhất)</Space>}
                  style={{ marginBottom: 16 }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ReTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="Hoàn thành" stroke="#10b981" fill="url(#gDone)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="Tạo mới" stroke="#94a3b8" fill="url(#gCreated)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                {/* Thành viên */}
                {memberStats.length > 0 && (
                  <Card
                    title={<Space><TeamOutlined style={{ color: '#4361ee' }} />Phân bổ task theo thành viên</Space>}
                    style={{ marginBottom: 16 }}
                  >
                    <Table dataSource={memberStats} columns={memberCols} rowKey="userId" size="small" pagination={false}
                      rowClassName={(r: MemberTaskStats) => r.overdue > 0 ? 'row-stat-overdue' : ''} />
                  </Card>
                )}

                {/* Cảnh báo */}
                <Row gutter={[12, 12]}>
                  <Col xs={24} lg={12}>
                    <Card title={
                      <Space>
                        <WarningOutlined style={{ color: '#ef4444' }} />
                        Task quá hạn
                        {overdueTasks.length > 0 && <Badge count={overdueTasks.length} style={{ backgroundColor: '#ef4444' }} />}
                      </Space>
                    }>
                      {overdueTasks.length === 0
                        ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có task quá hạn" style={{ padding: '12px 0' }} />
                        : <Table dataSource={overdueTasks} columns={alertCols('overdue')} rowKey="id" size="small"
                            scroll={{ x: 500 }} pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                            rowClassName={() => 'row-alert-overdue'} />
                      }
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title={
                      <Space>
                        <CalendarOutlined style={{ color: '#f59e0b' }} />
                        Sắp đến hạn (7 ngày tới)
                        {upcomingTasks.length > 0 && <Badge count={upcomingTasks.length} style={{ backgroundColor: '#f59e0b' }} />}
                      </Space>
                    }>
                      {upcomingTasks.length === 0
                        ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có task sắp đến hạn" style={{ padding: '12px 0' }} />
                        : <Table dataSource={upcomingTasks} columns={alertCols('upcoming')} rowKey="id" size="small"
                            scroll={{ x: 500 }} pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                            rowClassName={() => 'row-alert-upcoming'} />
                      }
                    </Card>
                  </Col>
                </Row>

                <style>{`
                  .row-stat-overdue td { background: ${token.colorErrorBg} !important; }
                  .row-stat-overdue:hover td { background: ${token.colorErrorBgHover} !important; }
                  .row-alert-overdue td { background: ${token.colorErrorBg} !important; }
                  .row-alert-overdue:hover td { background: ${token.colorErrorBgHover} !important; }
                  .row-alert-upcoming td { background: ${token.colorWarningBg} !important; }
                  .row-alert-upcoming:hover td { background: ${token.colorWarningBgHover} !important; }
                `}</style>
              </>
            );
          })()}
        </div>
      )}

      {/* Modal thêm thành viên */}
      <Modal title={<Space><UserAddOutlined />Thêm thành viên</Space>}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); setMemberSearchResults([]); }}
        footer={null} destroyOnHidden>
        <Form form={addForm} layout="vertical" onFinish={handleAddMember} style={{ marginTop: 8 }}>
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
          <Space>
            <Button type="primary" htmlType="submit" loading={addSaving}>Thêm vào dự án</Button>
            <Button onClick={() => { setAddModalOpen(false); addForm.resetFields(); setMemberSearchResults([]); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal tạo task từ tab Tasks */}
      <Modal
        title="Tạo task mới"
        open={createTaskModalOpen}
        onCancel={() => { setCreateTaskModalOpen(false); createTaskTabForm.resetFields(); setParentCandidates([]); }}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Form form={createTaskTabForm} layout="vertical" onFinish={handleCreateTaskFromTab} style={{ marginTop: 12 }}>
          <Form.Item label="Dự án">
            <Input value={currentProject ? `[${currentProject.key}] ${currentProject.name}` : ''} disabled />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[
              { required: true, message: 'Vui lòng nhập tiêu đề task!' },
              { max: 500, message: 'Tiêu đề không vượt quá 500 ký tự' },
              { whitespace: true, message: 'Tiêu đề không được chỉ có khoảng trắng' },
            ]}
          >
            <Input placeholder="Tiêu đề task" autoFocus maxLength={500} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Mô tả chi tiết (tùy chọn)" maxLength={5000} />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Mức ưu tiên"
            initialValue={TaskPriority.MEDIUM}
            rules={[{ required: isFieldRequired('priority'), message: 'Vui lòng chọn mức ưu tiên' }]}
          >
            <Select
              options={[
                { label: <Tag color="green">Thấp</Tag>, value: TaskPriority.LOW },
                { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
                { label: <Tag color="orange">Cao</Tag>, value: TaskPriority.HIGH },
                { label: <Tag color="red">Khẩn cấp</Tag>, value: TaskPriority.URGENT },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="assigneeId"
            label="Người thực hiện"
            rules={[{ required: isFieldRequired('assignee'), message: 'Vui lòng chọn người thực hiện' }]}
          >
            <Select
              allowClear
              showSearch
              placeholder="Chọn người thực hiện"
              optionFilterProp="label"
              options={members.map((m) => ({ label: m.fullName || m.username, value: m.userId }))}
            />
          </Form.Item>

          {categories.length > 0 && (
            <Form.Item name="categoryId" label="Danh mục">
              <Select
                allowClear
                placeholder="Không phân loại"
                options={categories.map(c => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="dueDate"
            label="Hạn chót"
            rules={[{ required: isFieldRequired('dueDate'), message: 'Vui lòng chọn hạn chót' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          {isFieldRequired('estimatedHours') && (
            <Form.Item
              name="estimatedHours"
              label="Giờ ước tính"
              rules={[{ required: true, message: 'Vui lòng nhập số giờ ước tính' }]}
            >
              <InputNumber min={0.5} max={9999} step={0.5} style={{ width: '100%' }} placeholder="VD: 8" />
            </Form.Item>
          )}

          <Form.Item
            name="sprintId"
            label="Sprint"
            rules={[{ required: true, message: 'Vui lòng chọn sprint!' }]}
          >
            <Select
              loading={tabSprintsLoading}
              placeholder={tabSprintsLoading ? 'Đang tải...' : 'Chọn sprint'}
              options={tabTaskSprints.map(s => ({
                label: <Space size={6}>
                  <Tag color={s.status === SprintStatus.ACTIVE ? 'green' : 'default'} style={{ margin: 0 }}>
                    {s.status === SprintStatus.ACTIVE ? 'Đang chạy' : 'Kế hoạch'}
                  </Tag>
                  {s.name}
                </Space>,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="parentTaskId"
            label={<Space size={4}><ApartmentOutlined />Đầu việc chính</Space>}
            extra="Để trống = task gốc (cấp 1)"
          >
            <Select
              allowClear
              showSearch
              loading={parentLoading}
              placeholder={parentLoading ? 'Đang tải...' : 'Không chọn = task gốc'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={parentCandidates.map(t => ({
                label: `[${t.taskKey}] ${t.title}`,
                value: t.id,
              }))}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={creatingTaskTab}>
                Tạo task
              </Button>
              <Button onClick={() => { setCreateTaskModalOpen(false); createTaskTabForm.resetFields(); setParentCandidates([]); }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
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
          <Form.Item name="defaultAssigneeId" label="Người thực hiện mặc định">
            <Select
              allowClear
              placeholder="Chọn thành viên..."
              options={members.map((m) => ({
                value: m.userId,
                label: (
                  <Space size={6}>
                    <Avatar src={resolveAvatarUrl(m.avatarUrl)} icon={<UserOutlined />} size={20} />
                    <span>{m.fullName || m.username}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={catSaving}>{editCat ? 'Cập nhật' : 'Thêm'}</Button>
            <Button onClick={() => { setCatModal(false); setEditCat(null); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal Label */}
      <Modal
        title={<Space><TagOutlined />Thêm nhãn</Space>}
        open={labelModal} onCancel={() => { setLabelModal(false); labelForm.resetFields(); setLabelColor('#1890ff'); }}
        footer={null} destroyOnHidden>
        <Form form={labelForm} layout="vertical" onFinish={handleCreateLabel} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên nhãn" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Bug, Frontend, Backend..." />
          </Form.Item>
          <Form.Item label="Màu sắc">
            <ColorPicker
              value={labelColor}
              onChange={(c) => setLabelColor(c.toHexString())}
              showText
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input placeholder="Mô tả ngắn về nhãn..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={labelSaving}>Thêm</Button>
            <Button onClick={() => { setLabelModal(false); labelForm.resetFields(); setLabelColor('#1890ff'); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      <style>{`
        .row-overdue td { background: #fff2f0 !important; }
        .row-subtask td { background: #f8faff !important; }
        .row-subtask:hover td { background: #eef3ff !important; }
        .row-subtask td:first-child { border-left: 3px solid #4361ee33 !important; }
      `}</style>
    </div>
  );
};

export default ProjectDetailPage;
