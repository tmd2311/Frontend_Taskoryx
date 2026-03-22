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
  Collapse,
  Empty,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  UserOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import type { TaskSummary, CreateTaskRequest, UpdateTaskRequest } from '../types';
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

// ─── Backlog row ──────────────────────────────────────────────
const BacklogRow: React.FC<{
  task: TaskSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, onOpen, onDelete }) => (
  <div
    onClick={() => onOpen(task.id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 12px',
      borderBottom: '1px solid #f5f5f5',
      cursor: 'pointer',
      transition: 'background .12s',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#fafafa')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
  >
    {/* Key */}
    <Tag style={{ fontFamily: 'monospace', fontSize: 11, margin: 0, flexShrink: 0 }}>
      {task.taskKey}
    </Tag>

    {/* Title */}
    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {task.title}
    </span>

    {/* Priority */}
    <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0, fontSize: 11, flexShrink: 0 }}>
      {PRIORITY_LABEL[task.priority]}
    </Tag>

    {/* Due date */}
    {task.dueDate ? (
      <Tooltip title={`Hạn: ${dayjs(task.dueDate).format('DD/MM/YYYY')}`}>
        <span
          style={{
            fontSize: 11,
            color: task.overdue ? '#f5222d' : '#8c8c8c',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {task.overdue && <ExclamationCircleOutlined />}
          {dayjs(task.dueDate).format('DD/MM')}
        </span>
      </Tooltip>
    ) : (
      <span style={{ width: 40, flexShrink: 0 }} />
    )}

    {/* Assignee */}
    <Tooltip title={task.assigneeName ?? 'Chưa giao'}>
      <Avatar
        size={22}
        src={task.assigneeAvatar}
        icon={<UserOutlined />}
        style={{ flexShrink: 0, opacity: task.assigneeName ? 1 : 0.3 }}
      />
    </Tooltip>

    {/* Counts */}
    {(task.commentCount > 0 || task.attachmentCount > 0) && (
      <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
        {task.commentCount > 0 && `💬${task.commentCount}`}
        {task.attachmentCount > 0 && ` 📎${task.attachmentCount}`}
      </Text>
    )}

    {/* Delete */}
    <Popconfirm
      title="Xóa task này?"
      onConfirm={(e) => { e?.stopPropagation(); onDelete(task.id); }}
      okText="Xóa"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
    >
      <Button
        type="text"
        size="small"
        danger
        icon={<DeleteOutlined />}
        style={{ flexShrink: 0, opacity: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      />
    </Popconfirm>
  </div>
);

// ─── TasksPage ────────────────────────────────────────────────
const TasksPage: React.FC = () => {
  const {
    myTasks,
    currentTask,
    isLoading,
    fetchMyTasks,
    fetchTaskById,
    createTask,
    updateTask,
    deleteTask,
    setCurrentTask,
  } = useTaskStore();

  const { projects, fetchProjects } = useProjectStore();

  const [view, setView] = useState<'list' | 'backlog'>('backlog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [form] = Form.useForm();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Collapse state: mặc định mở tất cả nhóm
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchMyTasks();
    fetchProjects();
  }, []);

  // Map projectKey → project để lấy màu & tên
  const projectByKey = useMemo(() => {
    const map: Record<string, { name: string; color: string; id: string }> = {};
    projects.forEach((p) => {
      map[p.key] = { name: p.name, color: p.color || '#1890ff', id: p.id };
    });
    return map;
  }, [projects]);

  // Group tasks theo project key prefix từ taskKey (VD: "PROJ-12" → "PROJ")
  const grouped = useMemo(() => {
    const map: Record<string, TaskSummary[]> = {};
    myTasks.forEach((t) => {
      const key = t.taskKey?.split('-')[0] ?? 'KHÁC';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [myTasks]);

  // Set mở tất cả nhóm khi data load xong
  useEffect(() => {
    setOpenGroups(Object.keys(grouped));
  }, [Object.keys(grouped).join(',')]);

  // ── Handlers ────────────────────────────────────────────────

  const handleOpenCreate = (projectId?: string) => {
    setEditingTask(null);
    setCurrentTask(null);
    form.resetFields();
    if (projectId) setSelectedProjectId(projectId);
    setIsModalOpen(true);
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
      });
    }
  }, [currentTask]);

  const handleSubmit = async (values: any) => {
    try {
      const dueDate = values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined;
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: values.title,
          description: values.description,
          priority: values.priority,
          assigneeId: values.assigneeId,
          dueDate,
        } as UpdateTaskRequest);
        message.success('Cập nhật task thành công!');
      } else {
        await createTask(selectedProjectId, {
          title: values.title,
          description: values.description,
          priority: values.priority,
          dueDate,
        } as CreateTaskRequest);
        message.success('Tạo task thành công!');
        await fetchMyTasks();
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingTask(null);
    } catch (error: any) {
      message.error(error.message || 'Thao tác thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      message.success('Đã xóa task');
    } catch (error: any) {
      message.error(error.message || 'Xóa thất bại');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingTask(null);
    setCurrentTask(null);
  };

  // ── Cột bảng danh sách ────────────────────────────────────
  const columns: ColumnsType<TaskSummary> = [
    {
      title: 'Mã',
      dataIndex: 'taskKey',
      key: 'taskKey',
      width: 100,
      render: (key: string) => <Tag style={{ fontFamily: 'monospace' }}>{key}</Tag>,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: '35%',
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p] ?? p}</Tag>,
    },
    {
      title: 'Hạn chót',
      dataIndex: 'dueDate',
      key: 'dueDate',
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
      render: (name?: string) => name ? (
        <Space size={6}><Avatar size={20} icon={<UserOutlined />} />{name}</Space>
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
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Xóa task này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Backlog collapse items ────────────────────────────────
  const collapseItems = Object.entries(grouped).map(([projKey, tasks]) => {
    const proj = projectByKey[projKey];
    const overdueCnt = tasks.filter((t) => t.overdue).length;

    return {
      key: projKey,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Thanh màu dự án */}
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: proj?.color ?? '#1890ff',
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <Text strong style={{ fontSize: 14 }}>
            {proj?.name ?? projKey}
          </Text>
          <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{projKey}</Tag>
          <Badge count={tasks.length} color={proj?.color ?? '#1890ff'} />
          {overdueCnt > 0 && (
            <Badge count={`${overdueCnt} quá hạn`} color="#f5222d" />
          )}
        </div>
      ),
      children: (
        <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
          {/* Header hàng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, width: 70 }}>Mã</Text>
            <Text type="secondary" style={{ fontSize: 11, flex: 1 }}>Tiêu đề</Text>
            <Text type="secondary" style={{ fontSize: 11, width: 80 }}>Ưu tiên</Text>
            <Text type="secondary" style={{ fontSize: 11, width: 50 }}>Hạn</Text>
            <Text type="secondary" style={{ fontSize: 11, width: 30 }}>Giao</Text>
            <span style={{ width: 80 }} />
          </div>

          {/* Task rows */}
          {tasks.map((t) => (
            <BacklogRow
              key={t.id}
              task={t}
              onOpen={(id) => setDetailTaskId(id)}
              onDelete={handleDelete}
            />
          ))}

          {/* Nút thêm task */}
          <div style={{ padding: '6px 12px' }}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              style={{ color: '#8c8c8c', fontSize: 13 }}
              onClick={() => proj && handleOpenCreate(proj.id)}
              disabled={!proj}
            >
              Thêm task vào {proj?.name ?? projKey}
            </Button>
          </div>
        </div>
      ),
    };
  });

  const totalOverdue = myTasks.filter((t) => t.overdue).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Đầu việc của tôi</Title>
          <Space size={8} style={{ marginTop: 4 }}>
            <Text type="secondary">{myTasks.length} task</Text>
            {totalOverdue > 0 && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                {totalOverdue} quá hạn
              </Tag>
            )}
          </Space>
        </div>

        <Space>
          <Segmented
            value={view}
            onChange={(v) => setView(v as 'list' | 'backlog')}
            options={[
              { label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Backlog', value: 'backlog', icon: <AppstoreOutlined /> },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenCreate()}
            disabled={projects.length === 0}
          >
            Tạo task
          </Button>
        </Space>
      </div>

      {/* ── Backlog view ────────────────────────────────────── */}
      {view === 'backlog' ? (
        myTasks.length === 0 && !isLoading ? (
          <Empty description="Không có task nào được giao cho bạn" />
        ) : (
          <Collapse
            activeKey={openGroups}
            onChange={(keys) => setOpenGroups(keys as string[])}
            expandIcon={({ isActive }) => (
              <CaretRightOutlined rotate={isActive ? 90 : 0} />
            )}
            style={{ background: 'transparent' }}
            items={collapseItems}
          />
        )
      ) : (
        /* ── List view ─────────────────────────────────────── */
        <Table
          columns={columns}
          dataSource={myTasks}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          locale={{ emptyText: 'Không có task nào được giao cho bạn' }}
          rowClassName={(r) => r.overdue ? 'row-overdue' : ''}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('.ant-btn') || target.closest('.ant-popconfirm')) return;
              setDetailTaskId(record.id);
            },
            style: { cursor: 'pointer' },
          })}
        />
      )}

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
                onChange={setSelectedProjectId}
                options={projects.map((p) => ({ label: `[${p.key}] ${p.name}`, value: p.id }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề task!' }]}
          >
            <Input placeholder="Tiêu đề task" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Mô tả chi tiết (tùy chọn)" />
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

      <TaskDetailDrawer
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onUpdated={fetchMyTasks}
        onDeleted={fetchMyTasks}
      />

      <style>{`
        .row-overdue td { background: #fff2f0 !important; }
      `}</style>
    </div>
  );
};

export default TasksPage;
