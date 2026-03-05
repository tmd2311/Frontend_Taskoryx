import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Button,
  Tag,
  Space,
  Typography,
  Spin,
  Form,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Divider,
  Descriptions,
  message,
  Avatar,
  Badge,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  SaveOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CommentOutlined,
  PaperClipOutlined,
  FolderOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '../stores/taskStore';
import { projectService } from '../services/projectService';
import type { ProjectMember } from '../types';
import { TaskPriority } from '../types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

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

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const { currentTask, isLoading, fetchTaskById, updateTask, deleteTask, setCurrentTask } =
    useTaskStore();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Danh sách thành viên project để chọn assignee
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const open = !!taskId;
  const task = currentTask?.id === taskId ? currentTask : null;

  // Fetch task khi taskId thay đổi
  useEffect(() => {
    if (taskId) {
      setEditMode(false);
      setMembers([]);
      fetchTaskById(taskId);
    }
  }, [taskId]);

  // Fetch members khi vào edit mode (dùng projectId từ task)
  useEffect(() => {
    if (editMode && task?.projectId && members.length === 0) {
      setMembersLoading(true);
      projectService
        .getMembers(task.projectId)
        .then(setMembers)
        .catch(() => {})
        .finally(() => setMembersLoading(false));
    }
  }, [editMode, task?.projectId]);

  const handleEnterEdit = () => {
    if (!task) return;
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigneeId: task.assigneeId ?? null,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
    });
    setEditMode(true);
  };

  const handleSave = async (values: any) => {
    if (!taskId) return;
    setSaving(true);
    try {
      await updateTask(taskId, {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        assigneeId: values.assigneeId ?? undefined,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      });
      message.success('Đã cập nhật task');
      setEditMode(false);
      onUpdated?.();
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await deleteTask(taskId);
      message.success('Đã xóa task');
      onDeleted?.();
      handleClose();
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleClose = () => {
    setEditMode(false);
    form.resetFields();
    setMembers([]);
    setCurrentTask(null);
    onClose();
  };

  // Options cho Select assignee
  const memberOptions = [
    { label: <Text type="secondary">— Bỏ trống —</Text>, value: null },
    ...members.map((m) => ({
      label: (
        <Space size={8}>
          <Avatar size={20} src={m.avatarUrl} icon={<UserOutlined />} />
          <span>{m.fullName || m.username}</span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {m.email}
          </Text>
        </Space>
      ),
      value: m.userId,
    })),
  ];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={540}
      styles={{ body: { padding: '16px 24px' } }}
      title={
        task ? (
          <Space size={8}>
            <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.taskKey}</Tag>
            <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0 }}>
              {PRIORITY_LABEL[task.priority]}
            </Tag>
            {task.overdue && (
              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>
                Quá hạn
              </Tag>
            )}
          </Space>
        ) : (
          'Chi tiết task'
        )
      }
      extra={
        task && !editMode ? (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={handleEnterEdit}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa task này?"
              description="Hành động này không thể hoàn tác."
              onConfirm={handleDelete}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ) : editMode ? (
          <Space>
            <Button
              icon={<SaveOutlined />}
              type="primary"
              size="small"
              loading={saving}
              onClick={() => form.submit()}
            >
              Lưu
            </Button>
            <Button icon={<CloseOutlined />} size="small" onClick={() => setEditMode(false)}>
              Hủy
            </Button>
          </Space>
        ) : null
      }
    >
      {isLoading && !task ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      ) : !task ? null : editMode ? (
        /* ── Chế độ chỉnh sửa ── */
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Tiêu đề task" maxLength={200} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết..." maxLength={2000} />
          </Form.Item>

          <Form.Item name="priority" label="Mức ưu tiên">
            <Select
              options={[
                { label: <Tag color="green">Thấp</Tag>,       value: TaskPriority.LOW },
                { label: <Tag color="blue">Trung bình</Tag>,  value: TaskPriority.MEDIUM },
                { label: <Tag color="orange">Cao</Tag>,        value: TaskPriority.HIGH },
                { label: <Tag color="red">Khẩn cấp</Tag>,     value: TaskPriority.URGENT },
              ]}
            />
          </Form.Item>

          {/* ── Assignee ── */}
          <Form.Item name="assigneeId" label="Giao cho">
            <Select
              loading={membersLoading}
              placeholder={membersLoading ? 'Đang tải thành viên...' : 'Chọn người thực hiện'}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label as any)?.props?.children
                  ?.map((c: any) => (typeof c === 'string' ? c : c?.props?.children ?? ''))
                  ?.join(' ')
                  ?.toLowerCase()
                  ?.includes(input.toLowerCase()) ?? false
              }
              options={memberOptions}
              optionLabelProp="label"
              notFoundContent={
                membersLoading ? <Spin size="small" /> : 'Không có thành viên'
              }
              // Render label gọn khi đã chọn (chỉ hiện tên, không hiện email)
              labelRender={(opt) => {
                if (!opt.value) return <Text type="secondary">— Bỏ trống —</Text>;
                const m = members.find((mb) => mb.userId === opt.value);
                if (!m) return <span>{opt.label as string}</span>;
                return (
                  <Space size={6}>
                    <Avatar size={18} src={m.avatarUrl} icon={<UserOutlined />} />
                    {m.fullName || m.username}
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item name="dueDate" label="Hạn chót">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      ) : (
        /* ── Chế độ xem ── */
        <>
          <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
            {task.title}
          </Title>

          {task.description ? (
            <Paragraph style={{ color: '#555', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </Paragraph>
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontStyle: 'italic' }}>
              Không có mô tả
            </Text>
          )}

          <Divider style={{ margin: '12px 0' }} />

          <Descriptions column={1} size="small" labelStyle={{ color: '#8c8c8c', width: 130 }}>
            {task.columnName && (
              <Descriptions.Item label={<Space size={4}><AppstoreOutlined />Cột</Space>}>
                <Tag>{task.columnName}</Tag>
              </Descriptions.Item>
            )}

            {task.projectName && (
              <Descriptions.Item label={<Space size={4}><FolderOutlined />Dự án</Space>}>
                <Space size={4}>
                  <Tag style={{ fontFamily: 'monospace' }}>{task.projectKey}</Tag>
                  {task.projectName}
                </Space>
              </Descriptions.Item>
            )}

            <Descriptions.Item label={<Space size={4}><UserOutlined />Assignee</Space>}>
              {task.assigneeName ? (
                <Space size={6}>
                  <Avatar size={20} icon={<UserOutlined />} />
                  <Text strong>{task.assigneeName}</Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa gán</Text>
              )}
            </Descriptions.Item>

            {task.reporterName && (
              <Descriptions.Item label={<Space size={4}><UserOutlined />Reporter</Space>}>
                {task.reporterName}
              </Descriptions.Item>
            )}

            <Descriptions.Item label={<Space size={4}><CalendarOutlined />Hạn chót</Space>}>
              {task.dueDate ? (
                <Text style={{ color: task.overdue ? '#f5222d' : undefined }}>
                  {task.overdue && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
                  {dayjs(task.dueDate).format('DD/MM/YYYY')}
                </Text>
              ) : (
                <Text type="secondary">Chưa đặt</Text>
              )}
            </Descriptions.Item>

            {task.startDate && (
              <Descriptions.Item label="Bắt đầu">
                {dayjs(task.startDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
            )}

            {(task.estimatedHours != null || task.actualHours != null) && (
              <Descriptions.Item label="Giờ (ước tính/thực)">
                {task.estimatedHours ?? '—'} / {task.actualHours ?? '—'} giờ
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Tạo lúc">
              {dayjs(task.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '12px 0' }} />

          {task.labels && task.labels.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Labels
              </Text>
              <Space wrap>
                {task.labels.map((label) => (
                  <Tag key={label.id} color={label.color}>
                    {label.name}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <Space size={16} style={{ marginTop: 4 }}>
            <Space size={4}>
              <CommentOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary">{task.commentCount} bình luận</Text>
            </Space>
            <Space size={4}>
              <PaperClipOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary">{task.attachmentCount} tệp đính kèm</Text>
            </Space>
          </Space>

          {task.overdue && (
            <div style={{ marginTop: 16 }}>
              <Badge
                status="error"
                text={
                  <Text type="danger" style={{ fontSize: 13 }}>
                    Quá hạn {dayjs().diff(dayjs(task.dueDate), 'day')} ngày
                  </Text>
                }
              />
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

export default TaskDetailDrawer;
