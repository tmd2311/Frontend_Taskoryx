import React, { useEffect, useState, useMemo } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Badge,
  Tooltip,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { taskService } from '../services/taskService';
import { sprintService } from '../services/sprintService';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Sprint, TaskSummary, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { TaskPriority } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

const STATUS_COLOR: Record<string, string> = {
  TODO: 'default',
  IN_PROGRESS: 'processing',
  IN_REVIEW: 'warning',
  RESOLVED: 'cyan',
  DONE: 'success',
  CANCELLED: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  TODO: 'Chưa làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Đang review',
  RESOLVED: 'Đã giải quyết',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// Flatten cây task (task cha + subTasks đệ quy) thành mảng phẳng giữ thứ tự
function flattenTree(tasks: TaskSummary[]): TaskSummary[] {
  const result: TaskSummary[] = [];
  const walk = (nodes: TaskSummary[]) => {
    nodes.forEach((t) => {
      result.push(t);
      if (t.subTasks?.length) walk(t.subTasks);
    });
  };
  walk(tasks);
  return result;
}

// ─── TasksPage ────────────────────────────────────────────────
const TasksPage: React.FC = () => {
  const {
    myTasks,
    isLoading,
    fetchMyTasks,
    fetchTaskById,
    createTask,
    updateTask,
    deleteTask,
    currentTask,
    setCurrentTask,
  } = useTaskStore();

  const { projects, fetchProjects } = useProjectStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [form] = Form.useForm();

  // Parent task selector state
  const [parentCandidates, setParentCandidates] = useState<TaskSummary[]>([]);
  const [parentLoading, setParentLoading] = useState(false);

  // Sprint selector state
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  useEffect(() => {
    fetchMyTasks();
    fetchProjects();
  }, []);

  // Redirect từ URL param ?openTask=<taskId> → /tasks/:taskKey
  useEffect(() => {
    const taskId = searchParams.get('openTask');
    if (!taskId) return;
    fetchTaskById(taskId)
      .then(() => {
        const task = useTaskStore.getState().currentTask;
        if (task?.taskKey) navigate(`/tasks/${task.taskKey}`, { replace: true });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // API /tasks/my trả về flat list (không có subTasks lồng)
  // Dùng parentTaskId để tự build cây rồi flatten theo thứ tự cha → con
  const flatTasks = useMemo(() => {
    const byId: Record<string, TaskSummary> = {};
    myTasks.forEach((t) => { byId[t.id] = t; });

    // Nếu API đã trả về subTasks lồng sẵn trong task cha, dùng luôn
    const hasTree = myTasks.some((t) => (t.subTasks?.length ?? 0) > 0);
    if (hasTree) return flattenTree(myTasks);

    // Ngược lại tự build từ parentTaskId
    const childrenOf: Record<string, TaskSummary[]> = {};
    myTasks.forEach((t) => {
      if (t.parentTaskId && byId[t.parentTaskId]) {
        if (!childrenOf[t.parentTaskId]) childrenOf[t.parentTaskId] = [];
        childrenOf[t.parentTaskId].push(t);
      }
    });
    const roots = myTasks.filter((t) => !t.parentTaskId || !byId[t.parentTaskId]);
    const walk = (node: TaskSummary): TaskSummary[] => [
      node,
      ...(childrenOf[node.id] ?? []).flatMap(walk),
    ];
    return roots.flatMap(walk);
  }, [myTasks]);

  // ── Handlers ────────────────────────────────────────────────

  const loadParentCandidates = async (projId: string, editingTaskId?: string) => {
    if (!projId) { setParentCandidates([]); return; }
    setParentLoading(true);
    try {
      const candidates = await taskService.getValidParentTasks(projId, editingTaskId);
      setParentCandidates(Array.isArray(candidates) ? candidates : []);
    } catch {
      setParentCandidates([]);
    } finally {
      setParentLoading(false);
    }
  };

  const loadSprints = async (projId: string) => {
    if (!projId) { setSprints([]); return; }
    setSprintsLoading(true);
    try {
      const data = await sprintService.getSprints(projId);
      setSprints(Array.isArray(data) ? data : []);
    } catch {
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  };

  const handleOpenCreate = async (projectId?: string) => {
    setEditingTask(null);
    setCurrentTask(null);
    form.resetFields();
    const pid = projectId || selectedProjectId;
    if (projectId) setSelectedProjectId(projectId);
    setIsModalOpen(true);
    if (pid) {
      loadParentCandidates(pid);
      loadSprints(pid);
    }
  };

  const handleEdit = async (record: TaskSummary) => {
    setEditingTask(record);
    await fetchTaskById(record.id);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (editingTask && currentTask?.id === editingTask.id) {
      form.setFieldsValue({
        title: currentTask.title,
        description: currentTask.description,
        priority: currentTask.priority,
        assigneeId: currentTask.assigneeId,
        dueDate: currentTask.dueDate ? dayjs(currentTask.dueDate) : null,
        parentTaskId: currentTask.parentTaskId ?? null,
      });
      if (currentTask.projectId) {
        loadParentCandidates(currentTask.projectId, currentTask.id);
      }
    }
  }, [currentTask]);

  const handleSubmit = async (values: any) => {
    try {
      const dueDate = values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined;
      if (editingTask) {
        const updatePayload: UpdateTaskRequest = {
          title: values.title,
          description: values.description,
          priority: values.priority,
          assigneeId: values.assigneeId,
          dueDate,
        };
        if (values.parentTaskId) {
          updatePayload.parentTaskId = values.parentTaskId;
        } else {
          updatePayload.clearParent = !!currentTask?.parentTaskId;
        }
        await updateTask(editingTask.id, updatePayload);
        message.success('Cập nhật task thành công!');
      } else {
        const createPayload: CreateTaskRequest = {
          title: values.title,
          description: values.description,
          priority: values.priority,
          sprintId: values.sprintId,
          dueDate,
        };
        if (values.parentTaskId) createPayload.parentTaskId = values.parentTaskId;
        await createTask(selectedProjectId, createPayload);
        message.success('Tạo task thành công!');
        await fetchMyTasks();
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingTask(null);
      setParentCandidates([]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Thao tác thất bại';
      message.error(msg);
    }
  };

  const handleDelete = async (record: TaskSummary) => {
    try {
      await deleteTask(record.id);
      message.success(
        record.subTasks?.length
          ? `Đã xóa task và ${record.subTasks.length} subtask`
          : 'Đã xóa task'
      );
      await fetchMyTasks();
    } catch (error: any) {
      message.error(error.message || 'Xóa thất bại');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingTask(null);
    setCurrentTask(null);
    setParentCandidates([]);
  };

  // ── Cột bảng ─────────────────────────────────────────────────
  const columns: ColumnsType<TaskSummary> = [
    {
      title: 'Mã',
      dataIndex: 'taskKey',
      key: 'taskKey',
      width: 110,
      render: (key: string, record) => (
        <Space size={4}>
          {(record.depth ?? 1) > 1 && (
            <span style={{ color: '#bfbfbf', fontSize: 11 }}>{'  ↳'.repeat((record.depth ?? 1) - 1)}</span>
          )}
          <Tag style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>{key}</Tag>
        </Space>
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (title: string, record) => (
        <span style={{ paddingLeft: ((record.depth ?? 1) - 1) * 16 }}>
          {title}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] as any} style={{ fontSize: 11 }}>
          {STATUS_LABEL[s] ?? s}
        </Tag>
      ),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (p: string) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p] ?? p}</Tag>,
    },
    {
      title: 'Hạn chót',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string, record) => {
        if (!date) return <Text type="secondary">—</Text>;
        return (
          <Space size={4}>
            {record.overdue && <ExclamationCircleOutlined style={{ color: 'red' }} />}
            <span style={{ color: record.overdue ? 'red' : undefined, fontSize: 13 }}>
              {dayjs(date).format('DD/MM/YYYY')}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      width: 150,
      render: (name?: string, record?: TaskSummary) => name ? (
        <Space size={6}>
          <Avatar size={20} src={record?.assigneeAvatar} icon={<UserOutlined />} />
          {name}
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Bình luận',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 90,
      render: (count: number) => <Badge count={count} showZero color="geekblue" />,
    },
    {
      title: 'Tệp đính kèm',
      dataIndex: 'attachmentCount',
      key: 'attachmentCount',
      width: 100,
      render: (count: number) => <Badge count={count} showZero color="green" />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button type="link" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }} />
          </Tooltip>
          <Popconfirm
            title={
              record.subTasks?.length
                ? `Task này có ${record.subTasks.length} subtask. Xóa sẽ xóa luôn tất cả subtask!`
                : 'Xóa task này?'
            }
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record); }}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalOverdue = flatTasks.filter((t) => t.overdue).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Đầu việc của tôi</Title>
          <Space size={8} style={{ marginTop: 4 }}>
            <Text type="secondary">{flatTasks.length} task</Text>
            {totalOverdue > 0 && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                {totalOverdue} quá hạn
              </Tag>
            )}
          </Space>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenCreate()}
          disabled={projects.length === 0}
        >
          Tạo task
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={flatTasks}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: 'Không có task nào được giao cho bạn' }}
        scroll={{ x: 'max-content' }}
        rowClassName={(r) => {
          const classes = [];
          if (r.overdue) classes.push('row-overdue');
          if ((r.depth ?? 1) > 1) classes.push('row-subtask');
          return classes.join(' ');
        }}
        onRow={(record) => ({
          onClick: (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('.ant-btn') || target.closest('.ant-popconfirm')) return;
            navigate(`/tasks/${record.taskKey}`);
          },
          style: { cursor: 'pointer' },
        })}
      />

      {/* Modal tạo/sửa task */}
      <Modal
        title={editingTask ? 'Chỉnh sửa task' : 'Tạo task mới'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
          {!editingTask && (
            <Form.Item label="Dự án" required>
              <Select
                placeholder="Chọn dự án"
                value={selectedProjectId || undefined}
                onChange={(id) => {
                  setSelectedProjectId(id);
                  form.setFieldValue('parentTaskId', null);
                  form.setFieldValue('sprintId', null);
                  loadParentCandidates(id);
                  loadSprints(id);
                }}
                options={projects.map((p) => ({ label: `[${p.key}] ${p.name}`, value: p.id }))}
              />
            </Form.Item>
          )}

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

          <Form.Item name="priority" label="Mức ưu tiên" initialValue={TaskPriority.MEDIUM}>
            <Select
              options={[
                { label: <Tag color="green">Thấp</Tag>, value: TaskPriority.LOW },
                { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
                { label: <Tag color="orange">Cao</Tag>, value: TaskPriority.HIGH },
                { label: <Tag color="red">Khẩn cấp</Tag>, value: TaskPriority.URGENT },
              ]}
            />
          </Form.Item>

          <Form.Item name="dueDate" label="Hạn chót">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          {/* Sprint – bắt buộc khi tạo task mới */}
          {!editingTask && selectedProjectId && (
            <Form.Item
              name="sprintId"
              label="Sprint"
              rules={[{ required: true, message: 'Vui lòng chọn sprint!' }]}
            >
              <Select
                loading={sprintsLoading}
                placeholder={sprintsLoading ? 'Đang tải...' : 'Chọn sprint'}
                options={sprints.map((s) => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          )}

          {/* Task cha */}
          {(selectedProjectId || editingTask) && (
            <Form.Item
              name="parentTaskId"
              label={
                <Space size={4}>
                  <ApartmentOutlined />
                  Task cha
                </Space>
              }
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
                options={parentCandidates.map((t) => ({
                  label: `[${t.taskKey}] ${t.title}`,
                  value: t.id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                disabled={!editingTask && !selectedProjectId}
              >
                {editingTask ? 'Cập nhật' : 'Tạo task'}
              </Button>
              <Button onClick={handleCancel}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-overdue td { background: #fff2f0 !important; }
        .row-subtask td { background: #fafcff !important; }
        .row-subtask:hover td { background: #f0f5ff !important; }
      `}</style>
    </div>
  );
};

export default TasksPage;
