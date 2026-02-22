import React, { useEffect, useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import type { TaskSummary, Task, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { TaskPriority } from '../types';
import dayjs from 'dayjs';

const { Title } = Typography;
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMyTasks();
    fetchProjects();
  }, []);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingTask(null);
    setCurrentTask(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa – load chi tiết task trước
  const handleEdit = async (record: TaskSummary) => {
    setEditingTask(record);
    await fetchTaskById(record.id);
    setIsModalOpen(true);
  };

  // Điền form khi có currentTask
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
        const payload: UpdateTaskRequest = {
          title: values.title,
          description: values.description,
          priority: values.priority,
          assigneeId: values.assigneeId,
          dueDate,
        };
        await updateTask(editingTask.id, payload);
        message.success('Cập nhật task thành công!');
      } else {
        const payload: CreateTaskRequest = {
          title: values.title,
          description: values.description,
          priority: values.priority,
          dueDate,
        };
        await createTask(selectedProjectId, payload);
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
      message.success('Xóa task thành công!');
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

  const columns: ColumnsType<TaskSummary> = [
    {
      title: 'Mã',
      dataIndex: 'taskKey',
      key: 'taskKey',
      width: 100,
      render: (key: string) => <Tag>{key}</Tag>,
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
      render: (priority: string) => (
        <Tag color={PRIORITY_COLOR[priority]}>
          {PRIORITY_LABEL[priority] ?? priority}
        </Tag>
      ),
    },
    {
      title: 'Hạn chót',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string, record) => {
        if (!date) return '-';
        return (
          <Space>
            {record.overdue && <ExclamationCircleOutlined style={{ color: 'red' }} />}
            <span style={{ color: record.overdue ? 'red' : undefined }}>
              {dayjs(date).format('DD/MM/YYYY')}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Assignee',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (name?: string) => name ?? '-',
    },
    {
      title: 'Comment',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 90,
      render: (count: number) => <Badge count={count} showZero color="geekblue" />,
    },
    {
      title: 'File',
      dataIndex: 'attachmentCount',
      key: 'attachmentCount',
      width: 70,
      render: (count: number) => <Badge count={count} showZero color="green" />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Xóa task"
            description="Bạn có chắc muốn xóa task này?"
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

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Task của tôi
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          disabled={projects.length === 0}
        >
          Tạo Task
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={myTasks}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Không có task nào được giao cho bạn' }}
      />

      <Modal
        title={editingTask ? 'Chỉnh sửa Task' : 'Tạo Task mới'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnHide
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Chọn project khi tạo mới */}
          {!editingTask && (
            <Form.Item
              label="Project"
              required
            >
              <Select
                placeholder="Chọn project"
                value={selectedProjectId || undefined}
                onChange={setSelectedProjectId}
                options={projects.map((p) => ({
                  label: `[${p.key}] ${p.name}`,
                  value: p.id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề task!' }]}
          >
            <Input placeholder="Tiêu đề task" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Mô tả chi tiết" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Ưu tiên"
            initialValue={TaskPriority.MEDIUM}
          >
            <Select>
              <Select.Option value={TaskPriority.LOW}>Thấp</Select.Option>
              <Select.Option value={TaskPriority.MEDIUM}>Trung bình</Select.Option>
              <Select.Option value={TaskPriority.HIGH}>Cao</Select.Option>
              <Select.Option value={TaskPriority.URGENT}>Khẩn cấp</Select.Option>
            </Select>
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
                {editingTask ? 'Cập nhật' : 'Tạo mới'}
              </Button>
              <Button onClick={handleCancel}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksPage;
