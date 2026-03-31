import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Button, Tabs, Table, Tag, Space, Input, Select, Badge,
  Avatar, Empty, Tooltip, Modal, Form, Popconfirm, message, Spin,
  DatePicker, Card, Progress, List, Timeline, Row, Col, Checkbox,
} from 'antd';
import {
  ArrowLeftOutlined, CheckSquareOutlined, TeamOutlined, ExclamationCircleOutlined,
  UserOutlined, CommentOutlined, PaperClipOutlined, SearchOutlined, ReloadOutlined,
  UserAddOutlined, DeleteOutlined, InboxOutlined, PlusOutlined, ArrowRightOutlined,
  ThunderboltOutlined, FlagOutlined, AppstoreAddOutlined, HistoryOutlined,
  PlayCircleOutlined, CheckCircleOutlined, EditOutlined,
  DownloadOutlined, TableOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useAdminStore } from '../stores/adminStore';
import { projectService } from '../services/projectService';
import { boardService } from '../services/boardService';
import { sprintService } from '../services/sprintService';
import { taskService } from '../services/taskService';
import { versionService } from '../services/versionService';
import { categoryService } from '../services/categoryService';
import { activityService } from '../services/activityService';
import { searchService } from '../services/searchService';
import { useAuthStore } from '../stores/authStore';
import type {
  TaskSummary, ProjectMember, Board, Sprint, Version, IssueCategory, ActivityLog, GanttTask,
} from '../types';
import { TaskPriority, ProjectRole, TaskStatus, SprintStatus, VersionStatus } from '../types';
import StatusSelect from '../components/StatusSelect';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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
const SPRINT_STATUS_COLOR: Record<string, string> = {
  PLANNED: 'default', ACTIVE: 'blue', COMPLETED: 'green', CANCELLED: 'red',
};
const SPRINT_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Kế hoạch', ACTIVE: 'Đang chạy', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
const VERSION_STATUS_COLOR: Record<string, string> = {
  OPEN: 'blue', LOCKED: 'orange', CLOSED: 'green',
};
const VERSION_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Đang mở', LOCKED: 'Đã khóa', CLOSED: 'Đã đóng',
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

  const { currentProject, members, fetchProjectById, fetchMembers, deleteProject } = useProjectStore();
  const {
    projectTasks, isLoading, fetchProjectTasks,
    backlog, backlogLoading, fetchBacklog,
    updateTaskStatus, moveTask, createTask,
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

  // Backlog
  const [backlogTab, setBacklogTab] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [moveModalTask, setMoveModalTask] = useState<TaskSummary | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>();
  const [moveLoading, setMoveLoading] = useState(false);
  const [createBacklogModal, setCreateBacklogModal] = useState(false);
  const [createForm] = Form.useForm();
  const [createSaving, setCreateSaving] = useState(false);
  // Backlog selection – thêm vào sprint
  const [backlogSelected, setBacklogSelected] = useState<string[]>([]);
  const [addToSprintModal, setAddToSprintModal] = useState(false);
  const [addToSprintId, setAddToSprintId] = useState<string | undefined>();
  const [addToSprintLoading, setAddToSprintLoading] = useState(false);

  // Sprints
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintModal, setSprintModal] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [sprintForm] = Form.useForm();
  const [sprintSaving, setSprintSaving] = useState(false);
  // Sprint tasks
  const [sprintBacklogs, setSprintBacklogs] = useState<Record<string, TaskSummary[]>>({});
  const [sprintBacklogLoading, setSprintBacklogLoading] = useState<Record<string, boolean>>({});
  const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});
  // Add task to sprint
  const [addTaskSprintId, setAddTaskSprintId] = useState<string | null>(null);
  const [backlogForSprint, setBacklogForSprint] = useState<TaskSummary[]>([]);
  const [backlogForSprintLoading, setBacklogForSprintLoading] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [addingTasks, setAddingTasks] = useState(false);
  // Complete sprint flow
  const [completeSprintId, setCompleteSprintId] = useState<string | null>(null);
  const [incompleteTasksForSprint, setIncompleteTasksForSprint] = useState<TaskSummary[]>([]);
  const [completeSprintLoading, setCompleteSprintLoading] = useState(false);
  // Versions
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionModal, setVersionModal] = useState(false);
  const [editVersion, setEditVersion] = useState<Version | null>(null);
  const [versionForm] = Form.useForm();
  const [versionSaving, setVersionSaving] = useState(false);

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
    boardService.getProjectBoards(projectId).then(setBoards).catch(() => {});
    // Tải roles từ API để dùng cho dropdown chọn vai trò thành viên (silent nếu không có quyền)
    if (systemRoles.length === 0) fetchRoles().catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const params: any = { page: page - 1, size: PAGE_SIZE };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filterPriority.length) params.priorities = filterPriority.join(',');
    if (filterOverdue !== undefined) params.overdue = filterOverdue;
    fetchProjectTasks(projectId, params);
  }, [projectId, page, keyword, filterPriority, filterOverdue]);

  useEffect(() => {
    if (backlogTab && projectId) fetchBacklog(projectId);
  }, [backlogTab, projectId]);

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

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    setVersionsLoading(true);
    try {
      const data = await versionService.getVersions(projectId);
      setVersions(data);
    } catch { /* ignore */ } finally {
      setVersionsLoading(false);
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
      const data = await versionService.getGantt(projectId);
      setGanttTasks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setGanttError(e.message || 'Không thể tải dữ liệu Gantt');
    } finally {
      setGanttLoading(false);
    }
  }, [projectId]);

  const handleTabChange = (key: string) => {
    setBacklogTab(key === 'backlog');
    if (key === 'sprints') fetchSprints();
    if (key === 'versions') fetchVersions();
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

  // ── Backlog ───────────────────────────────────────────────
  const handleCreateBacklogTask = async (values: any) => {
    if (!projectId) return;
    setCreateSaving(true);
    try {
      await createTask(projectId, {
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      });
      message.success('Đã tạo task vào Backlog');
      setCreateBacklogModal(false);
      createForm.resetFields();
      fetchBacklog(projectId);
    } catch (e: any) {
      message.error(e.message || 'Tạo task thất bại');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleMoveToBoard = async () => {
    if (!moveModalTask || !selectedColumnId) return;
    setMoveLoading(true);
    try {
      await moveTask(moveModalTask.id, { targetColumnId: selectedColumnId, newPosition: 0 });
      message.success('Đã đưa task vào Board');
      setMoveModalTask(null);
      setSelectedBoardId(undefined);
      setSelectedColumnId(undefined);
      if (projectId) fetchBacklog(projectId);
    } catch (e: any) {
      message.error(e.message || 'Di chuyển thất bại');
    } finally {
      setMoveLoading(false);
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

  // Thêm task đã chọn từ Backlog vào sprint
  const handleAddBacklogToSprint = async () => {
    if (!addToSprintId || backlogSelected.length === 0) return;
    setAddToSprintLoading(true);
    try {
      await Promise.all(
        backlogSelected.map((taskId) => sprintService.addTask(addToSprintId, { taskId }))
      );
      message.success(`Đã thêm ${backlogSelected.length} task vào sprint`);
      setAddToSprintModal(false);
      setBacklogSelected([]);
      setAddToSprintId(undefined);
      // Reload backlog
      if (projectId) fetchBacklog(projectId);
    } catch (e: any) {
      message.error(e.message || 'Thêm task thất bại');
    } finally {
      setAddToSprintLoading(false);
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

  // Tải task đang trong sprint (sprint backlog)
  const fetchSprintBacklog = async (sprintId: string) => {
    setSprintBacklogLoading((prev) => ({ ...prev, [sprintId]: true }));
    try {
      const tasks = await sprintService.getBacklog(sprintId);
      setSprintBacklogs((prev) => ({ ...prev, [sprintId]: tasks }));
    } catch { /* im lặng */ } finally {
      setSprintBacklogLoading((prev) => ({ ...prev, [sprintId]: false }));
    }
  };

  // Toggle mở/đóng danh sách task của sprint
  const toggleSprintExpand = (sprintId: string) => {
    const next = !expandedSprints[sprintId];
    setExpandedSprints((prev) => ({ ...prev, [sprintId]: next }));
    if (next && !sprintBacklogs[sprintId]) {
      fetchSprintBacklog(sprintId);
    }
  };

  // Mở modal thêm task vào sprint
  const openAddTaskToSprint = async (sprintId: string) => {
    setAddTaskSprintId(sprintId);
    setSelectedTaskIds([]);
    setBacklogForSprintLoading(true);
    try {
      // Lấy Product Backlog để chọn task
      const tasks = await taskService.getBacklog(projectId!);
      setBacklogForSprint(Array.isArray(tasks) ? tasks : (tasks as any).content ?? []);
    } catch { setBacklogForSprint([]); } finally {
      setBacklogForSprintLoading(false);
    }
  };

  // Thêm các task đã chọn vào sprint
  const handleAddTasksToSprint = async () => {
    if (!addTaskSprintId || selectedTaskIds.length === 0) return;
    setAddingTasks(true);
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          sprintService.addTask(addTaskSprintId, { taskId })
        )
      );
      message.success(`Đã thêm ${selectedTaskIds.length} task vào sprint`);
      setAddTaskSprintId(null);
      setSelectedTaskIds([]);
      fetchSprintBacklog(addTaskSprintId);
    } catch (e: any) {
      message.error(e.message || 'Thêm task thất bại');
    } finally {
      setAddingTasks(false);
    }
  };

  // Gỡ task khỏi sprint
  const handleRemoveTaskFromSprint = async (sprintId: string, taskId: string) => {
    try {
      await sprintService.removeTask(sprintId, taskId);
      message.success('Đã gỡ task khỏi sprint');
      fetchSprintBacklog(sprintId);
    } catch (e: any) {
      message.error(e.message || 'Gỡ task thất bại');
    }
  };

  // Hoàn thành sprint – kiểm tra task chưa xong
  const handleCompleteSprint = async (sprint: Sprint) => {
    const tasks = sprintBacklogs[sprint.id] || [];
    const incomplete = tasks.filter(
      (t) => !['DONE', 'RESOLVED', 'CANCELLED'].includes(t.status)
    );
    if (incomplete.length > 0) {
      setCompleteSprintId(sprint.id);
      setIncompleteTasksForSprint(incomplete);
      return; // mở modal xử lý task chưa xong
    }
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

  // Đưa tất cả task chưa xong về backlog rồi complete sprint
  const handleCompleteAndMoveToBacklog = async () => {
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

  // ── Versions ──────────────────────────────────────────────
  const handleSaveVersion = async (values: any) => {
    if (!projectId) return;
    setVersionSaving(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        status: values.status,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        releaseDate: values.releaseDate ? values.releaseDate.format('YYYY-MM-DD') : undefined,
      };
      if (editVersion) {
        await versionService.update(editVersion.id, payload);
        message.success('Đã cập nhật version');
      } else {
        await versionService.create(projectId, payload);
        message.success('Đã tạo version');
      }
      setVersionModal(false);
      versionForm.resetFields();
      setEditVersion(null);
      fetchVersions();
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setVersionSaving(false);
    }
  };

  const handleDeleteVersion = async (id: string) => {
    try {
      await versionService.delete(id);
      message.success('Đã xóa version');
      fetchVersions();
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
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
  const color = project?.color || '#1890ff';
  const canDelete = isAdmin || project?.currentUserRole === ProjectRole.OWNER;

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
      {/* Header */}
      <div style={{
        background: color, borderRadius: 10, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }} />

        <div style={{ flex: 1 }}>
          <Space align="center" size={10}>
            <Tag style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>
              {project?.key ?? '...'}
            </Tag>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {project?.name ?? 'Đang tải...'}
            </Title>
          </Space>
          {project?.description && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'block', marginTop: 4 }}>
              {project.description}
            </Text>
          )}
        </div>

        <Space size={8} wrap>
          <Space size={4} style={{ color: 'rgba(255,255,255,0.9)' }}>
            <CheckSquareOutlined />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>{project?.taskCount ?? total} CV</Text>
          </Space>
          <Space size={4}>
            <TeamOutlined style={{ color: 'rgba(255,255,255,0.9)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>{project?.memberCount ?? members.length} TV</Text>
          </Space>
          <Tooltip title="Xuất Excel">
            <Button icon={<DownloadOutlined />} size="small"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
              onClick={handleExport}>Export</Button>
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title="Xóa dự án này?" description="Hành động này không thể hoàn tác. Dự án cần phải không còn task."
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
              <Tooltip title="Xóa dự án">
                <Button danger icon={<DeleteOutlined />} size="small"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
                  loading={deleting} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="tasks"
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

          // ─────── BACKLOG ───────
          {
            key: 'backlog',
            label: <Space><InboxOutlined />Backlog<Badge count={backlog.length} color="#fa8c16" /></Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Task chưa được đưa vào bảng Kanban</Text>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { createForm.resetFields(); setCreateBacklogModal(true); }}>
                    Thêm task vào Backlog
                  </Button>
                </div>
                {/* Selection action bar */}
                {backlogSelected.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 6, marginBottom: 8, border: '1px solid #91caff' }}>
                    <Text strong style={{ color: '#1677ff' }}>{backlogSelected.length} task đã chọn</Text>
                    <Button type="primary" size="small" icon={<ThunderboltOutlined />}
                      onClick={() => setAddToSprintModal(true)}>
                      Thêm vào Sprint
                    </Button>
                    <Button size="small" onClick={() => setBacklogSelected([])}>Bỏ chọn</Button>
                  </div>
                )}
                {backlogLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : backlog.length === 0 ? (
                  <Empty image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                    description="Backlog trống — tất cả task đã được đưa vào bảng"
                    style={{ padding: '40px 0' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '32px 110px 1fr 140px 120px 90px 80px', padding: '6px 12px', background: '#fafafa', borderRadius: 6, fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>
                      <Checkbox
                        checked={backlogSelected.length === backlog.length}
                        indeterminate={backlogSelected.length > 0 && backlogSelected.length < backlog.length}
                        onChange={(e) => setBacklogSelected(e.target.checked ? backlog.map(t => t.id) : [])}
                      />
                      <span>Mã</span><span>Tiêu đề</span><span>Trạng thái</span><span>Ưu tiên</span><span>Hạn chót</span><span></span>
                    </div>
                    {backlog.map((task) => (
                      <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '32px 110px 1fr 140px 120px 90px 80px', padding: '8px 12px', background: backlogSelected.includes(task.id) ? '#f0f7ff' : '#fff', borderRadius: 6, border: `1px solid ${backlogSelected.includes(task.id) ? '#91caff' : '#f0f0f0'}`, alignItems: 'center', gap: 4 }}>
                        <Checkbox
                          checked={backlogSelected.includes(task.id)}
                          onChange={(e) => {
                            if (e.target.checked) setBacklogSelected(prev => [...prev, task.id]);
                            else setBacklogSelected(prev => prev.filter(id => id !== task.id));
                          }}
                        />
                        <Tag style={{ fontFamily: 'monospace', margin: 0, width: 'fit-content' }}>{task.taskKey}</Tag>
                        <Button type="link" style={{ padding: 0, textAlign: 'left', height: 'auto', fontWeight: 400, fontSize: 13 }}
                          onClick={() => navigate(`/tasks/${task.taskKey}`)}>
                          {task.title}
                        </Button>
                        <StatusSelect value={task.status} size="small"
                          onChange={async (status) => {
                            try {
                              await updateTaskStatus(task.id, { status: status as TaskStatus });
                            } catch (e: any) {
                              message.error(e.message || 'Cập nhật thất bại');
                            }
                          }}
                        />
                        <Tag color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Tag>
                        <Text style={{ fontSize: 12, color: task.overdue ? '#f5222d' : '#8c8c8c' }}>
                          {task.dueDate ? dayjs(task.dueDate).format('DD/MM/YY') : '—'}
                        </Text>
                        <Button size="small" icon={<ArrowRightOutlined />}
                          onClick={() => { setMoveModalTask(task); setSelectedBoardId(boards[0]?.id); setSelectedColumnId(undefined); }}>
                          Board
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sprints.map((sprint) => {
                      const expanded = expandedSprints[sprint.id];
                      const sprintTasks = sprintBacklogs[sprint.id] || [];
                      const backlogLoading = sprintBacklogLoading[sprint.id];
                      const done = sprintTasks.filter(t => ['DONE','RESOLVED','CANCELLED'].includes(t.status)).length;
                      const total = sprint.taskCount ?? sprintTasks.length;
                      const completed = sprint.completedTaskCount ?? done;
                      const pct = total > 0 ? Math.round(completed / total * 100) : 0;

                      return (
                        <Card key={sprint.id} size="small"
                          style={{ borderLeft: `4px solid ${sprint.status === SprintStatus.ACTIVE ? '#1890ff' : sprint.status === SprintStatus.COMPLETED ? '#52c41a' : '#d9d9d9'}` }}
                          extra={
                            <Space>
                              {sprint.status === SprintStatus.PLANNED && (
                                <Popconfirm title="Bắt đầu sprint này?" onConfirm={() => handleStartSprint(sprint.id)}
                                  okText="Bắt đầu" cancelText="Hủy">
                                  <Button size="small" type="primary" icon={<PlayCircleOutlined />}>Bắt đầu</Button>
                                </Popconfirm>
                              )}
                              {sprint.status === SprintStatus.ACTIVE && (
                                <Button size="small" icon={<CheckCircleOutlined />}
                                  onClick={() => handleCompleteSprint(sprint)}>
                                  Hoàn thành
                                </Button>
                              )}
                              {sprint.status !== SprintStatus.COMPLETED && (
                                <Button size="small" icon={<PlusOutlined />}
                                  onClick={() => openAddTaskToSprint(sprint.id)}>
                                  Thêm task
                                </Button>
                              )}
                              <Button size="small" icon={<EditOutlined />}
                                onClick={() => {
                                  setEditSprint(sprint);
                                  sprintForm.setFieldsValue({
                                    name: sprint.name,
                                    goal: sprint.goal,
                                    startDate: sprint.startDate ? dayjs(sprint.startDate) : null,
                                    endDate: sprint.endDate ? dayjs(sprint.endDate) : null,
                                  });
                                  setSprintModal(true);
                                }} />
                              {sprint.status === SprintStatus.PLANNED && (
                                <Popconfirm title="Xóa sprint này?" onConfirm={() => handleDeleteSprint(sprint.id)}
                                  okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              )}
                            </Space>
                          }
                        >
                          {/* Header sprint */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <Space wrap>
                                <Text strong>{sprint.name}</Text>
                                <Tag color={SPRINT_STATUS_COLOR[sprint.status]}>{SPRINT_STATUS_LABEL[sprint.status]}</Tag>
                                {sprint.boardName && <Tag icon={<AppstoreAddOutlined />}>{sprint.boardName}</Tag>}
                              </Space>
                              {sprint.goal && <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{sprint.goal}</Text>}
                              {/* Progress bar */}
                              {total > 0 && (
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                    <Text type="secondary">{completed}/{total} task hoàn thành</Text>
                                    <Text style={{ color: pct === 100 ? '#52c41a' : '#1890ff' }}>{pct}%</Text>
                                  </div>
                                  <Progress percent={pct} size="small" showInfo={false}
                                    strokeColor={pct === 100 ? '#52c41a' : '#1890ff'} />
                                </div>
                              )}
                            </div>
                            <Space direction="vertical" size={2} style={{ textAlign: 'right', fontSize: 12, flexShrink: 0 }}>
                              {sprint.startDate && <Text type="secondary">Bắt đầu: {dayjs(sprint.startDate).format('DD/MM/YYYY')}</Text>}
                              {sprint.endDate && <Text type="secondary">Kết thúc: {dayjs(sprint.endDate).format('DD/MM/YYYY')}</Text>}
                              {sprint.status === SprintStatus.ACTIVE && sprint.endDate && dayjs().isAfter(dayjs(sprint.endDate)) && (
                                <Tag color="red" style={{ margin: 0 }}>Quá hạn!</Tag>
                              )}
                            </Space>
                          </div>

                          {/* Toggle xem tasks */}
                          <div style={{ marginTop: 10 }}>
                            <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}
                              onClick={() => toggleSprintExpand(sprint.id)}>
                              {expanded ? '▲ Ẩn task' : `▼ Xem task trong sprint${total > 0 ? ` (${total})` : ''}`}
                            </Button>
                          </div>

                          {/* Danh sách tasks */}
                          {expanded && (
                            <div style={{ marginTop: 10 }}>
                              {backlogLoading ? (
                                <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
                              ) : sprintTasks.length === 0 ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Sprint chưa có task nào. Nhấn "Thêm task" để thêm từ Product Backlog.
                                </Text>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {sprintTasks.map((t) => (
                                    <div key={t.id} style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '6px 10px', background: '#fafafa',
                                      borderRadius: 4, border: '1px solid #f0f0f0',
                                    }}>
                                      <Tag style={{ fontFamily: 'monospace', margin: 0, fontSize: 11 }}>{t.taskKey}</Tag>
                                      <Text style={{ flex: 1, fontSize: 13 }} ellipsis={{ tooltip: t.title }}>{t.title}</Text>
                                      <Tag color={PRIORITY_COLOR[t.priority]} style={{ margin: 0, fontSize: 11 }}>{PRIORITY_LABEL[t.priority]}</Tag>
                                      <StatusSelect value={t.status} size="small"
                                        onChange={async (s) => {
                                          try {
                                            await import('../services/taskService').then(m =>
                                              m.taskService.updateStatus(t.id, { status: s as TaskStatus })
                                            );
                                            fetchSprintBacklog(sprint.id);
                                          } catch { /* ignore */ }
                                        }} />
                                      {t.assigneeName && (
                                        <Tooltip title={t.assigneeName}>
                                          <Avatar size={20} icon={<UserOutlined />} />
                                        </Tooltip>
                                      )}
                                      <Popconfirm title="Gỡ task khỏi sprint?"
                                        onConfirm={() => handleRemoveTaskFromSprint(sprint.id, t.id)}
                                        okText="Gỡ" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                      </Popconfirm>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Modal thêm task vào sprint */}
                <Modal
                  title={<Space><InboxOutlined />Thêm task vào Sprint từ Product Backlog</Space>}
                  open={!!addTaskSprintId}
                  onCancel={() => { setAddTaskSprintId(null); setSelectedTaskIds([]); }}
                  onOk={handleAddTasksToSprint}
                  okText={`Thêm (${selectedTaskIds.length})`}
                  cancelText="Hủy"
                  okButtonProps={{ disabled: selectedTaskIds.length === 0, loading: addingTasks }}
                  width={600}
                  destroyOnHidden
                >
                  {backlogForSprintLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                  ) : backlogForSprint.length === 0 ? (
                    <Empty description="Product Backlog trống – tạo task mới trước" />
                  ) : (
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                        Chọn task từ Product Backlog để thêm vào sprint:
                      </Text>
                      <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {backlogForSprint.map((t) => {
                          const checked = selectedTaskIds.includes(t.id);
                          return (
                            <div key={t.id}
                              onClick={() => setSelectedTaskIds(prev =>
                                checked ? prev.filter(id => id !== t.id) : [...prev, t.id]
                              )}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                                background: checked ? '#e6f7ff' : '#fafafa',
                                border: `1px solid ${checked ? '#1890ff' : '#f0f0f0'}`,
                              }}>
                              <input type="checkbox" checked={checked} readOnly style={{ cursor: 'pointer' }} />
                              <Tag style={{ fontFamily: 'monospace', margin: 0, fontSize: 11 }}>{t.taskKey}</Tag>
                              <Text style={{ flex: 1, fontSize: 13 }}>{t.title}</Text>
                              <Tag color={PRIORITY_COLOR[t.priority]} style={{ margin: 0, fontSize: 11 }}>{PRIORITY_LABEL[t.priority]}</Tag>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Modal>

                {/* Modal xử lý task chưa xong khi complete sprint */}
                <Modal
                  title={<Space><ExclamationCircleOutlined style={{ color: '#faad14' }} />Hoàn thành Sprint</Space>}
                  open={!!completeSprintId}
                  onCancel={() => { setCompleteSprintId(null); setIncompleteTasksForSprint([]); }}
                  footer={
                    <Space>
                      <Button onClick={() => { setCompleteSprintId(null); setIncompleteTasksForSprint([]); }}>Hủy</Button>
                      <Button danger loading={completeSprintLoading} onClick={handleCompleteAndMoveToBacklog}>
                        Đưa về Backlog & Hoàn thành
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
                    <b>Đưa về Backlog & Hoàn thành</b>: Các task chưa xong sẽ trở về Product Backlog.<br/>
                    <b>Hoàn thành (giữ)</b>: Các task vẫn nằm trong sprint đã hoàn thành.
                  </div>
                </Modal>
              </>
            ),
          },

          // ─────── VERSIONS ───────
          {
            key: 'versions',
            label: <Space><FlagOutlined />Versions</Space>,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text type="secondary">{versions.length} versions/milestones</Text>
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { versionForm.resetFields(); setEditVersion(null); setVersionModal(true); }}>
                    Tạo Version
                  </Button>
                </div>
                {versionsLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : versions.length === 0 ? (
                  <Empty description="Chưa có version nào" style={{ padding: '40px 0' }} />
                ) : (
                  <Row gutter={[12, 12]}>
                    {versions.map((v) => (
                      <Col key={v.id} xs={24} sm={12} lg={8}>
                        <Card size="small"
                          extra={
                            <Space>
                              <Button size="small" icon={<EditOutlined />}
                                onClick={() => {
                                  setEditVersion(v);
                                  versionForm.setFieldsValue({
                                    name: v.name, description: v.description, status: v.status,
                                    dueDate: v.dueDate ? dayjs(v.dueDate) : null,
                                    releaseDate: v.releaseDate ? dayjs(v.releaseDate) : null,
                                  });
                                  setVersionModal(true);
                                }} />
                              <Popconfirm title="Xóa version này?" onConfirm={() => handleDeleteVersion(v.id)}
                                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          }
                        >
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            <Space>
                              <FlagOutlined style={{ color: '#722ed1' }} />
                              <Text strong>{v.name}</Text>
                              <Tag color={VERSION_STATUS_COLOR[v.status]}>{VERSION_STATUS_LABEL[v.status]}</Tag>
                            </Space>
                            {v.description && <Text type="secondary" style={{ fontSize: 12 }}>{v.description}</Text>}
                            {v.dueDate && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Hạn: {dayjs(v.dueDate).format('DD/MM/YYYY')}
                              </Text>
                            )}
                            {(v.totalTasks ?? 0) > 0 && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <Text type="secondary">{v.completedTasks}/{v.totalTasks} task</Text>
                                  <Text type="secondary">{v.completionPercent ?? 0}%</Text>
                                </div>
                                <Progress percent={v.completionPercent ?? 0} size="small" showInfo={false} />
                              </div>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
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

      {/* Modal tạo task Backlog */}
      <Modal title={<Space><InboxOutlined />Thêm task vào Backlog</Space>}
        open={createBacklogModal} onCancel={() => setCreateBacklogModal(false)} footer={null} destroyOnHidden>
        <Form form={createForm} layout="vertical" onFinish={handleCreateBacklogTask}
          style={{ marginTop: 8 }} initialValues={{ priority: TaskPriority.MEDIUM }}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}>
            <Input placeholder="Tiêu đề task" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết..." maxLength={2000} />
          </Form.Item>
          <Form.Item name="priority" label="Mức ưu tiên">
            <Select options={[
              { label: <Tag color="green">Thấp</Tag>, value: TaskPriority.LOW },
              { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
              { label: <Tag color="orange">Cao</Tag>, value: TaskPriority.HIGH },
              { label: <Tag color="red">Khẩn cấp</Tag>, value: TaskPriority.URGENT },
            ]} />
          </Form.Item>
          <Form.Item name="dueDate" label="Hạn chót">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={createSaving}>Tạo task</Button>
            <Button onClick={() => setCreateBacklogModal(false)}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal đưa task vào Board */}
      <Modal title={<Space><ArrowRightOutlined />Đưa vào Board</Space>}
        open={!!moveModalTask}
        onCancel={() => { setMoveModalTask(null); setSelectedBoardId(undefined); setSelectedColumnId(undefined); }}
        onOk={handleMoveToBoard} okText="Đưa vào Board" cancelText="Hủy"
        okButtonProps={{ disabled: !selectedColumnId, loading: moveLoading }} destroyOnHidden>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Task: </Text>
          <Tag style={{ fontFamily: 'monospace' }}>{moveModalTask?.taskKey}</Tag>
          <Text strong>{moveModalTask?.title}</Text>
        </div>
        <Form layout="vertical">
          <Form.Item label="Bảng Kanban">
            <Select value={selectedBoardId}
              onChange={(v) => { setSelectedBoardId(v); setSelectedColumnId(undefined); }}
              placeholder="Chọn bảng"
              options={boards.map((b) => ({ label: b.name, value: b.id }))} />
          </Form.Item>
          <Form.Item label="Cột">
            <Select value={selectedColumnId} onChange={setSelectedColumnId}
              placeholder="Chọn cột" disabled={!selectedBoardId}
              options={(boards.find((b) => b.id === selectedBoardId)?.columns ?? []).map((c) => ({ label: c.name, value: c.id }))} />
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

      {/* Modal Thêm Backlog vào Sprint */}
      <Modal
        title={<Space><ThunderboltOutlined />Thêm task vào Sprint</Space>}
        open={addToSprintModal}
        onCancel={() => { setAddToSprintModal(false); setAddToSprintId(undefined); }}
        onOk={handleAddBacklogToSprint}
        okText={`Thêm ${backlogSelected.length} task`}
        cancelText="Hủy"
        okButtonProps={{ disabled: !addToSprintId || backlogSelected.length === 0, loading: addToSprintLoading }}
        destroyOnHidden>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Đã chọn <Text strong>{backlogSelected.length}</Text> task từ Backlog</Text>
        </div>
        <Form layout="vertical">
          <Form.Item label="Chọn Sprint" required>
            <Select
              value={addToSprintId}
              onChange={setAddToSprintId}
              placeholder="Chọn sprint để thêm task vào"
              options={sprints
                .filter(s => s.status !== 'COMPLETED')
                .map(s => ({
                  label: <Space>
                    <Tag color={s.status === 'ACTIVE' ? 'blue' : 'default'} style={{ margin: 0 }}>{s.status === 'ACTIVE' ? 'Đang chạy' : 'Kế hoạch'}</Tag>
                    {s.name}
                  </Space>,
                  value: s.id,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Version */}
      <Modal
        title={<Space><FlagOutlined />{editVersion ? 'Sửa Version' : 'Tạo Version'}</Space>}
        open={versionModal} onCancel={() => { setVersionModal(false); setEditVersion(null); }}
        footer={null} destroyOnHidden>
        <Form form={versionForm} layout="vertical" onFinish={handleSaveVersion} style={{ marginTop: 8 }}
          initialValues={{ status: VersionStatus.OPEN }}>
          <Form.Item name="name" label="Tên Version" rules={[{ required: true }]}>
            <Input placeholder="VD: v1.0.0" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả version..." />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { label: 'Đang mở', value: VersionStatus.OPEN },
              { label: 'Đã khóa', value: VersionStatus.LOCKED },
              { label: 'Đã đóng', value: VersionStatus.CLOSED },
            ]} />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="dueDate" label="Ngày dự kiến release" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="releaseDate" label="Ngày release thực tế" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" htmlType="submit" loading={versionSaving}>{editVersion ? 'Cập nhật' : 'Tạo Version'}</Button>
            <Button onClick={() => { setVersionModal(false); setEditVersion(null); }}>Hủy</Button>
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
