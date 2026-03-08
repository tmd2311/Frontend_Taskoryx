import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Tabs,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Badge,
  Avatar,
  Empty,
  Tooltip,
  Modal,
  Form,
  Popconfirm,
  message,
  Spin,
  DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CommentOutlined,
  PaperClipOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserAddOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { projectService } from '../services/projectService';
import { boardService } from '../services/boardService';
import { useAuthStore } from '../stores/authStore';
import type { TaskSummary, ProjectMember, Board } from '../types';
import { TaskPriority, ProjectRole, TaskStatus } from '../types';
import StatusSelect from '../components/StatusSelect';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green',
  [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange',
  [TaskPriority.URGENT]: 'red',
};

const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',
  [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao',
  [TaskPriority.URGENT]: 'Khẩn cấp',
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'gold',
  ADMIN: 'red',
  MEMBER: 'blue',
  VIEWER: 'default',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Quản trị viên',
  ADMIN: 'Quản trị',
  MEMBER: 'Thành viên',
  VIEWER: 'Người xem',
};

const ROLE_OPTIONS = [
  { label: 'Quản trị', value: ProjectRole.ADMIN },
  { label: 'Thành viên', value: ProjectRole.MEMBER },
  { label: 'Người xem', value: ProjectRole.VIEWER },
];

// ─── Task columns ────────────────────────────────────────────
const buildTaskColumns = (): ColumnsType<TaskSummary> => [
  {
    title: 'Mã',
    dataIndex: 'taskKey',
    key: 'taskKey',
    width: 110,
    render: (key: string) => <Tag style={{ fontFamily: 'monospace' }}>{key}</Tag>,
  },
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: 'Ưu tiên',
    dataIndex: 'priority',
    key: 'priority',
    width: 120,
    render: (p: string) => (
      <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p] ?? p}</Tag>
    ),
  },
  {
    title: 'Người thực hiện',
    dataIndex: 'assigneeName',
    key: 'assigneeName',
    width: 150,
    render: (name?: string) =>
      name ? (
        <Space size={6}>
          <Avatar size={24} icon={<UserOutlined />} />
          <Text style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: 'Hạn chót',
    dataIndex: 'dueDate',
    key: 'dueDate',
    width: 130,
    render: (date: string, record) => {
      if (!date) return <Text type="secondary">—</Text>;
      return (
        <Space size={4}>
          {record.overdue && (
            <Tooltip title="Quá hạn">
              <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
            </Tooltip>
          )}
          <Text style={{ color: record.overdue ? '#f5222d' : undefined, fontSize: 13 }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      );
    },
  },
  {
    title: '',
    key: 'meta',
    width: 80,
    render: (_: any, record) => (
      <Space size={8}>
        {record.commentCount > 0 && (
          <Tooltip title={`${record.commentCount} bình luận`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              <CommentOutlined /> {record.commentCount}
            </span>
          </Tooltip>
        )}
        {record.attachmentCount > 0 && (
          <Tooltip title={`${record.attachmentCount} tệp đính kèm`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              <PaperClipOutlined /> {record.attachmentCount}
            </span>
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
  const { projectTasks, isLoading, fetchProjectTasks, backlog, backlogLoading, fetchBacklog, updateTaskStatus, moveTask, createTask } = useTaskStore();
  const { isAdmin } = useAuthStore();

  // Bộ lọc task
  const [keyword, setKeyword] = useState('');
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterOverdue, setFilterOverdue] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Thêm thành viên
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addSaving, setAddSaving] = useState(false);

  // Đổi vai trò
  const [roleUpdating, setRoleUpdating] = useState<string>(''); // userId đang cập nhật

  // Xóa dự án
  const [deleting, setDeleting] = useState(false);

  // Backlog
  const [backlogTab, setBacklogTab] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [moveModalTask, setMoveModalTask] = useState<TaskSummary | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>();
  const [moveLoading, setMoveLoading] = useState(false);

  // Tạo task Backlog
  const [createBacklogModal, setCreateBacklogModal] = useState(false);
  const [createForm] = Form.useForm();
  const [createSaving, setCreateSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId);
    fetchMembers(projectId);
    // Fetch boards for Move-to-Board feature
    boardService.getProjectBoards(projectId).then(setBoards).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const params: any = {
      page: page - 1,
      size: PAGE_SIZE,
    };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filterPriority.length) params.priorities = filterPriority.join(',');
    if (filterOverdue !== undefined) params.overdue = filterOverdue;
    fetchProjectTasks(projectId, params);
  }, [projectId, page, keyword, filterPriority, filterOverdue]);

  // Fetch backlog khi chuyển sang tab backlog
  useEffect(() => {
    if (backlogTab && projectId) fetchBacklog(projectId);
  }, [backlogTab, projectId]);

  const handleSearch = (v: string) => {
    setKeyword(v);
    setPage(1);
  };

  const handleReload = () => {
    if (!projectId) return;
    setPage(1);
    fetchProjectTasks(projectId, { page: 0, size: PAGE_SIZE });
  };

  // ── Thêm thành viên ─────────────────────────────────────────
  const handleAddMember = async (values: { email: string; role: string }) => {
    if (!projectId) return;
    setAddSaving(true);
    try {
      await projectService.addMember(projectId, {
        email: values.email.trim(),
        role: values.role as any,
      });
      message.success('Đã thêm thành viên vào dự án');
      setAddModalOpen(false);
      addForm.resetFields();
      fetchMembers(projectId);
    } catch (e: any) {
      message.error(e.message || 'Thêm thành viên thất bại');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Đổi vai trò ─────────────────────────────────────────────
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

  // ── Xóa thành viên ──────────────────────────────────────────
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

  // ── Cột bảng thành viên (có action) ─────────────────────────
  const buildMemberColumns = (): ColumnsType<ProjectMember> => [
    {
      title: 'Thành viên',
      key: 'user',
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
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      render: (role: string, m) => {
        if (role === ProjectRole.OWNER) {
          return <Tag color={ROLE_COLOR[role]}>Quản trị viên</Tag>;
        }
        return (
          <Select
            size="small"
            value={role}
            loading={roleUpdating === m.userId}
            style={{ width: 150 }}
            options={ROLE_OPTIONS}
            onChange={(v) => handleChangeRole(m.userId, v)}
          />
        );
      },
    },
    {
      title: 'Tham gia',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      width: 130,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, m) => {
        if (m.role === ProjectRole.OWNER) return null;
        return (
          <Popconfirm
            title={`Xóa ${m.fullName || m.username} khỏi dự án?`}
            onConfirm={() => handleRemoveMember(m.userId, m.fullName || m.username)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa khỏi dự án">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        );
      },
    },
  ];

  // ── Tạo task Backlog ─────────────────────────────────────────
  const handleCreateBacklogTask = async (values: any) => {
    if (!projectId) return;
    setCreateSaving(true);
    try {
      await createTask(projectId, {
        title: values.title,
        description: values.description,
        priority: values.priority,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        // không truyền boardId/columnId → task vào Backlog
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

  // ── Đưa task vào Board ───────────────────────────────────────
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

  // ── Xóa dự án ───────────────────────────────────────────────
  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeleting(true);
    try {
      await deleteProject(projectId);
      message.success('Đã xóa dự án thành công');
      navigate('/projects', { replace: true });
    } catch (e: any) {
      setDeleting(false);
      const status = (e as any)?.status ?? (e as any)?.response?.status;
      if (status === 400) {
        Modal.warning({
          title: 'Không thể xóa dự án',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>{e.message || 'Dự án vẫn còn task, vui lòng xóa hết task trước.'}</p>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => { Modal.destroyAll(); }}
              >
                Xem danh sách task ↓ (chuyển sang tab Công việc)
              </Button>
            </div>
          ),
          okText: 'Đóng',
        });
      } else if (status === 403) {
        message.error('Bạn không có quyền xóa dự án này');
      } else {
        message.error(e.message || 'Xóa dự án thất bại');
      }
    }
  };

  const tasks = projectTasks?.content ?? [];
  const total = projectTasks?.totalElements ?? 0;
  const project = currentProject?.id === projectId ? currentProject : null;
  const color = project?.color || '#1890ff';
  const canDelete = isAdmin || project?.currentUserRole === ProjectRole.OWNER;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: color,
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/projects')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
        />

        <div style={{ flex: 1 }}>
          <Space align="center" size={10}>
            <Tag
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                color: '#fff',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
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

        <Space size={16}>
          <Space size={4} style={{ color: 'rgba(255,255,255,0.9)' }}>
            <CheckSquareOutlined />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              {project?.taskCount ?? total} công việc
            </Text>
          </Space>
          <Space size={4}>
            <TeamOutlined style={{ color: 'rgba(255,255,255,0.9)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              {project?.memberCount ?? members.length} thành viên
            </Text>
          </Space>
          {canDelete && (
            <Popconfirm
              title="Xóa dự án này?"
              description="Hành động này không thể hoàn tác. Dự án cần phải không còn task."
              onConfirm={handleDeleteProject}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleting }}
            >
              <Tooltip title="Xóa dự án">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
                  loading={deleting}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="tasks"
        onChange={(key) => setBacklogTab(key === 'backlog')}
        items={[
          {
            key: 'tasks',
            label: (
              <Space>
                <CheckSquareOutlined />
                Công việc
                <Badge count={total} color="#1890ff" />
              </Space>
            ),
            children: (
              <>
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Tìm kiếm task..."
                    allowClear
                    style={{ width: 240 }}
                    onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                    onChange={(e) => !e.target.value && handleSearch('')}
                    onBlur={(e) => handleSearch(e.target.value)}
                  />
                  <Select
                    mode="multiple"
                    placeholder="Lọc theo ưu tiên"
                    allowClear
                    style={{ minWidth: 200 }}
                    value={filterPriority}
                    onChange={(v) => { setFilterPriority(v); setPage(1); }}
                    options={[
                      { label: 'Thấp', value: TaskPriority.LOW },
                      { label: 'Trung bình', value: TaskPriority.MEDIUM },
                      { label: 'Cao', value: TaskPriority.HIGH },
                      { label: 'Khẩn cấp', value: TaskPriority.URGENT },
                    ]}
                  />
                  <Select
                    placeholder="Trạng thái hạn"
                    allowClear
                    style={{ width: 160 }}
                    value={filterOverdue}
                    onChange={(v) => { setFilterOverdue(v); setPage(1); }}
                    options={[
                      { label: 'Quá hạn', value: true },
                      { label: 'Còn hạn', value: false },
                    ]}
                  />
                  <Tooltip title="Làm mới">
                    <Button icon={<ReloadOutlined />} onClick={handleReload} loading={isLoading} />
                  </Tooltip>
                </div>

                <Table
                  columns={buildTaskColumns()}
                  dataSource={tasks}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total,
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
          {
            key: 'members',
            label: (
              <Space>
                <TeamOutlined />
                Thành viên
                <Badge count={members.length} color="#52c41a" />
              </Space>
            ),
            children: (
              <>
                {/* Toolbar thành viên */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => { addForm.resetFields(); setAddModalOpen(true); }}
                  >
                    Thêm thành viên
                  </Button>
                </div>

                <Table
                  columns={buildMemberColumns()}
                  dataSource={members}
                  rowKey="id"
                  pagination={false}
                  locale={{ emptyText: <Empty description="Không có thành viên" /> }}
                />
              </>
            ),
          },
          {
            key: 'backlog',
            label: (
              <Space>
                <InboxOutlined />
                Backlog
                <Badge count={backlog.length} color="#fa8c16" />
              </Space>
            ),
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Task chưa được đưa vào bảng Kanban
                  </Text>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { createForm.resetFields(); setCreateBacklogModal(true); }}
                  >
                    Thêm task vào Backlog
                  </Button>
                </div>

                {backlogLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : backlog.length === 0 ? (
                  <Empty
                    image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                    description="Backlog trống — tất cả task đã được đưa vào bảng"
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Header row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr 140px 120px 90px 80px',
                      padding: '6px 12px',
                      background: '#fafafa',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#8c8c8c',
                      fontWeight: 500,
                    }}>
                      <span>Mã</span>
                      <span>Tiêu đề</span>
                      <span>Trạng thái</span>
                      <span>Ưu tiên</span>
                      <span>Hạn chót</span>
                      <span></span>
                    </div>
                    {backlog.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px 1fr 140px 120px 90px 80px',
                          padding: '8px 12px',
                          background: '#fff',
                          borderRadius: 6,
                          border: '1px solid #f0f0f0',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Tag style={{ fontFamily: 'monospace', margin: 0, width: 'fit-content' }}>{task.taskKey}</Tag>
                        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: task.title }}>{task.title}</Text>
                        <StatusSelect
                          value={task.status}
                          size="small"
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
                        <Button
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => {
                            setMoveModalTask(task);
                            setSelectedBoardId(boards[0]?.id);
                            setSelectedColumnId(undefined);
                          }}
                        >
                          Board
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ),
          },
        ]}
      />

      {/* Modal thêm thành viên */}
      <Modal
        title={
          <Space>
            <UserAddOutlined />
            Thêm thành viên vào dự án
          </Space>
        }
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        destroyOnHide
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddMember}
          style={{ marginTop: 8 }}
          initialValues={{ role: ProjectRole.MEMBER }}
        >
          <Form.Item
            name="email"
            label="Email người dùng"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input placeholder="Nhập email tài khoản cần thêm" size="large" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
          >
            <Select size="large" options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={addSaving}>
                Thêm vào dự án
              </Button>
              <Button onClick={() => setAddModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal tạo task Backlog */}
      <Modal
        title={<Space><InboxOutlined />Thêm task vào Backlog</Space>}
        open={createBacklogModal}
        onCancel={() => setCreateBacklogModal(false)}
        footer={null}
        destroyOnHide
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateBacklogTask}
          style={{ marginTop: 8 }}
          initialValues={{ priority: TaskPriority.MEDIUM }}
        >
          <Form.Item name="title" label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}>
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
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createSaving}>Tạo task</Button>
              <Button onClick={() => setCreateBacklogModal(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal đưa task vào Board */}
      <Modal
        title={<Space><ArrowRightOutlined />Đưa vào Board</Space>}
        open={!!moveModalTask}
        onCancel={() => { setMoveModalTask(null); setSelectedBoardId(undefined); setSelectedColumnId(undefined); }}
        onOk={handleMoveToBoard}
        okText="Đưa vào Board"
        cancelText="Hủy"
        okButtonProps={{ disabled: !selectedColumnId, loading: moveLoading }}
        destroyOnHide
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Task: </Text>
          <Tag style={{ fontFamily: 'monospace' }}>{moveModalTask?.taskKey}</Tag>
          <Text strong>{moveModalTask?.title}</Text>
        </div>
        <Form layout="vertical">
          <Form.Item label="Bảng Kanban">
            <Select
              value={selectedBoardId}
              onChange={(v) => { setSelectedBoardId(v); setSelectedColumnId(undefined); }}
              placeholder="Chọn bảng"
              options={boards.map((b) => ({ label: b.name, value: b.id }))}
            />
          </Form.Item>
          <Form.Item label="Cột">
            <Select
              value={selectedColumnId}
              onChange={setSelectedColumnId}
              placeholder="Chọn cột"
              disabled={!selectedBoardId}
              options={(boards.find((b) => b.id === selectedBoardId)?.columns ?? []).map((c) => ({
                label: c.name, value: c.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-overdue td {
          background: #fff2f0 !important;
        }
      `}</style>
    </div>
  );
};

export default ProjectDetailPage;
