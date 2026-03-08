import React, { useEffect, useRef, useState } from 'react';
import {
  Drawer, Button, Tag, Space, Typography, Spin, Form, Input, Select,
  DatePicker, Popconfirm, Divider, Descriptions, message, Avatar, Badge,
  Tabs, List, Upload, Tooltip, Image,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, CloseOutlined, SaveOutlined, UserOutlined,
  CalendarOutlined, ExclamationCircleOutlined, CommentOutlined,
  PaperClipOutlined, FolderOutlined, AppstoreOutlined, SendOutlined,
  FileOutlined, FileImageOutlined, FilePdfOutlined, FileExcelOutlined,
  FileWordOutlined, FileZipOutlined, ReloadOutlined, DownloadOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { projectService } from '../services/projectService';
import type { ProjectMember, Comment, Attachment } from '../types';
import { TaskPriority, TaskStatus } from '../types';
import StatusSelect, { StatusTag } from './StatusSelect';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Hằng số ────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green',   [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange', [TaskPriority.URGENT]: 'red',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',   [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao',   [TaskPriority.URGENT]: 'Khẩn cấp',
};

// ─── Icon file theo extension ────────────────────────────────
function getFileIcon(fileType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (fileType.startsWith('image/'))
    return <FileImageOutlined style={{ color: '#52c41a', fontSize: 22 }} />;
  if (fileType === 'application/pdf' || ext === 'pdf')
    return <FilePdfOutlined style={{ color: '#f5222d', fontSize: 22 }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return <FileExcelOutlined style={{ color: '#237804', fontSize: 22 }} />;
  if (['doc', 'docx'].includes(ext))
    return <FileWordOutlined style={{ color: '#1890ff', fontSize: 22 }} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return <FileZipOutlined style={{ color: '#fa8c16', fontSize: 22 }} />;
  return <FileOutlined style={{ color: '#8c8c8c', fontSize: 22 }} />;
}

// ─── CommentItem ────────────────────────────────────────────
interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment, currentUserId, depth = 0, onReply, onEdit, onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editSaving, setEditSaving] = useState(false);
  const isOwn = currentUserId === comment.userId;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setEditSaving(true);
    await onEdit(comment, editContent.trim());
    setEditSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: depth === 0 ? 16 : 8 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {/* Avatar */}
        <Avatar
          src={comment.userAvatar}
          icon={<UserOutlined />}
          size={depth === 0 ? 36 : 28}
          style={{ flexShrink: 0, marginTop: 2 }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <Space size={6} style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: depth === 0 ? 13 : 12 }}>
              {comment.userFullName || comment.username}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(comment.createdAt).fromNow()}
            </Text>
            {comment.isEdited && (
              <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>(đã sửa)</Text>
            )}
          </Space>

          {/* Nội dung / form edit */}
          {editing ? (
            <div>
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoSize={{ minRows: 2 }}
                style={{ marginBottom: 6 }}
              />
              <Space size={6}>
                <Button
                  size="small"
                  type="primary"
                  loading={editSaving}
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Lưu
                </Button>
                <Button size="small" onClick={() => { setEditing(false); setEditContent(comment.content); }}>
                  Hủy
                </Button>
              </Space>
            </div>
          ) : (
            <div
              style={{
                background: depth === 0 ? '#f5f5f5' : '#fafafa',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {comment.content}
            </div>
          )}

          {/* Actions */}
          {!editing && (
            <Space size={12} style={{ marginTop: 4 }}>
              {depth === 0 && (
                <Button type="link" size="small" style={{ padding: 0, fontSize: 12, height: 'auto' }}
                  onClick={() => onReply(comment)}>
                  Trả lời
                </Button>
              )}
              {isOwn && (
                <>
                  <Button type="link" size="small" style={{ padding: 0, fontSize: 12, height: 'auto' }}
                    onClick={() => setEditing(true)}>
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Xóa bình luận này?"
                    onConfirm={() => onDelete(comment.id)}
                    okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                  >
                    <Button type="link" size="small" danger style={{ padding: 0, fontSize: 12, height: 'auto' }}>
                      Xóa
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  depth={1}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Props ───────────────────────────────────────────────────
interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

// ─── TaskDetailDrawer ────────────────────────────────────────
const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId, onClose, onUpdated, onDeleted,
}) => {
  const { user } = useAuthStore();
  const {
    currentTask, isLoading, fetchTaskById, updateTask, updateTaskStatus, deleteTask, setCurrentTask,
    comments, commentsLoading, fetchComments, addComment, updateComment, deleteComment,
    attachments, attachmentsLoading, fetchAttachments, uploadAttachment, deleteAttachment,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState('detail');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Members for assignee select
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentSending, setCommentSending] = useState(false);
  const commentInputRef = useRef<any>(null);

  // Upload
  const [uploading, setUploading] = useState(false);

  const open = !!taskId;
  const task = currentTask?.id === taskId ? currentTask : null;

  // ── Fetch task khi mở ──────────────────────────────────────
  useEffect(() => {
    if (taskId) {
      setEditMode(false);
      setActiveTab('detail');
      setMembers([]);
      setNewComment('');
      setReplyTo(null);
      fetchTaskById(taskId);
    }
  }, [taskId]);

  // ── Fetch theo tab ─────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    if (activeTab === 'comments') fetchComments(taskId);
    if (activeTab === 'attachments') fetchAttachments(taskId);
  }, [activeTab, taskId]);

  // ── Fetch members khi vào edit mode ───────────────────────
  useEffect(() => {
    if (editMode && task?.projectId && members.length === 0) {
      setMembersLoading(true);
      projectService.getMembers(task.projectId)
        .then(setMembers).catch(() => {})
        .finally(() => setMembersLoading(false));
    }
  }, [editMode, task?.projectId]);

  // ── Edit task ─────────────────────────────────────────────
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
    setNewComment('');
    setReplyTo(null);
    setCurrentTask(null);
    onClose();
  };

  // ── Comments ──────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!taskId || !newComment.trim()) return;
    setCommentSending(true);
    try {
      await addComment(taskId, {
        content: newComment.trim(),
        parentId: replyTo?.id,
      });
      setNewComment('');
      setReplyTo(null);
    } catch (e: any) {
      message.error(e.message || 'Gửi bình luận thất bại');
    } finally {
      setCommentSending(false);
    }
  };

  const handleEditComment = async (comment: Comment, newContent: string) => {
    try {
      await updateComment(comment.id, { content: newContent });
    } catch (e: any) {
      message.error(e.message || 'Sửa thất bại');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  // ── Attachments ───────────────────────────────────────────
  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: async (file) => {
      if (!taskId) return false;
      if (file.size > 10 * 1024 * 1024) {
        message.error('File không được vượt quá 10MB');
        return false;
      }
      setUploading(true);
      try {
        await uploadAttachment(taskId, file);
        message.success(`Đã tải lên "${file.name}"`);
      } catch (e: any) {
        message.error(e.message || 'Tải lên thất bại');
      } finally {
        setUploading(false);
      }
      return false; // chặn upload mặc định của antd
    },
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await deleteAttachment(id);
      message.success('Đã xóa tệp');
    } catch (e: any) {
      message.error(e.message || 'Xóa tệp thất bại');
    }
  };

  // ── Options assignee ──────────────────────────────────────
  const memberOptions = [
    { label: <Text type="secondary">— Bỏ trống —</Text>, value: null },
    ...members.map((m) => ({
      label: (
        <Space size={8}>
          <Avatar size={20} src={m.avatarUrl} icon={<UserOutlined />} />
          <span>{m.fullName || m.username}</span>
          <Text type="secondary" style={{ fontSize: 11 }}>{m.email}</Text>
        </Space>
      ),
      value: m.userId,
    })),
  ];

  // ── Root-level comments ───────────────────────────────────
  const rootComments = comments.filter((c) => !c.parentId);

  // ── Tabs ──────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'detail',
      label: 'Chi tiết',
      children: null, // rendered below
    },
    {
      key: 'comments',
      label: (
        <Space size={4}>
          <CommentOutlined />
          Bình luận
          {task && task.commentCount > 0 && (
            <Badge count={task.commentCount} size="small" color="#1890ff" />
          )}
        </Space>
      ),
      children: null,
    },
    {
      key: 'attachments',
      label: (
        <Space size={4}>
          <PaperClipOutlined />
          Tệp đính kèm
          {task && task.attachmentCount > 0 && (
            <Badge count={task.attachmentCount} size="small" color="#52c41a" />
          )}
        </Space>
      ),
      children: null,
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={580}
      styles={{ body: { padding: '0 0 0 0', display: 'flex', flexDirection: 'column', height: '100%' } }}
      title={
        task ? (
          <Space size={8}>
            <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.taskKey}</Tag>
            <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0 }}>
              {PRIORITY_LABEL[task.priority]}
            </Tag>
            <StatusTag status={task.status} />
            {task.overdue && (
              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>
                Quá hạn
              </Tag>
            )}
          </Space>
        ) : 'Chi tiết task'
      }
      extra={
        task && activeTab === 'detail' && !editMode ? (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={handleEnterEdit}>Sửa</Button>
            <Popconfirm
              title="Xóa task này?" description="Hành động này không thể hoàn tác."
              onConfirm={handleDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} size="small">Xóa</Button>
            </Popconfirm>
          </Space>
        ) : task && activeTab === 'detail' && editMode ? (
          <Space>
            <Button icon={<SaveOutlined />} type="primary" size="small" loading={saving}
              onClick={() => form.submit()}>Lưu</Button>
            <Button icon={<CloseOutlined />} size="small" onClick={() => setEditMode(false)}>Hủy</Button>
          </Space>
        ) : null
      }
    >
      {isLoading && !task ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      ) : !task ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tabs header */}
          <Tabs
            activeKey={activeTab}
            onChange={(k) => { setActiveTab(k); setEditMode(false); }}
            items={tabItems}
            style={{ paddingLeft: 24, paddingRight: 24 }}
            tabBarStyle={{ marginBottom: 0 }}
          />

          <Divider style={{ margin: 0 }} />

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

            {/* ═══════════ CHI TIẾT ═══════════ */}
            {activeTab === 'detail' && (editMode ? (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Form.Item name="title" label="Tiêu đề"
                  rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                  <Input placeholder="Tiêu đề task" maxLength={200} />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={4} placeholder="Mô tả chi tiết..." maxLength={2000} />
                </Form.Item>
                <Form.Item name="priority" label="Mức ưu tiên">
                  <Select options={[
                    { label: <Tag color="green">Thấp</Tag>,       value: TaskPriority.LOW },
                    { label: <Tag color="blue">Trung bình</Tag>,  value: TaskPriority.MEDIUM },
                    { label: <Tag color="orange">Cao</Tag>,        value: TaskPriority.HIGH },
                    { label: <Tag color="red">Khẩn cấp</Tag>,     value: TaskPriority.URGENT },
                  ]} />
                </Form.Item>
                <Form.Item name="assigneeId" label="Giao cho">
                  <Select
                    loading={membersLoading}
                    placeholder={membersLoading ? 'Đang tải...' : 'Chọn người thực hiện'}
                    allowClear showSearch
                    options={memberOptions}
                    optionLabelProp="label"
                    labelRender={(opt) => {
                      if (!opt.value) return <Text type="secondary">— Bỏ trống —</Text>;
                      const m = members.find((mb) => mb.userId === opt.value);
                      if (!m) return <span>{String(opt.label)}</span>;
                      return (
                        <Space size={6}>
                          <Avatar size={18} src={m.avatarUrl} icon={<UserOutlined />} />
                          {m.fullName || m.username}
                        </Space>
                      );
                    }}
                    filterOption={(input, option) =>
                      JSON.stringify(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
                <Form.Item name="dueDate" label="Hạn chót">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Form>
            ) : (
              <>
                <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>{task.title}</Title>
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
                  <Descriptions.Item label="Trạng thái">
                    <StatusSelect
                      value={task.status}
                      size="small"
                      onChange={async (status) => {
                        try {
                          await updateTaskStatus(task.id, { status: status as TaskStatus });
                          message.success('Đã cập nhật trạng thái');
                        } catch (e: any) {
                          message.error(e.message || 'Cập nhật thất bại');
                        }
                      }}
                    />
                  </Descriptions.Item>
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
                    ) : <Text type="secondary">Chưa gán</Text>}
                  </Descriptions.Item>
                  {task.reporterName && (
                    <Descriptions.Item label="Người tạo">{task.reporterName}</Descriptions.Item>
                  )}
                  <Descriptions.Item label={<Space size={4}><CalendarOutlined />Hạn chót</Space>}>
                    {task.dueDate ? (
                      <Text style={{ color: task.overdue ? '#f5222d' : undefined }}>
                        {task.overdue && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
                        {dayjs(task.dueDate).format('DD/MM/YYYY')}
                        {task.overdue && ` (quá ${dayjs().diff(dayjs(task.dueDate), 'day')} ngày)`}
                      </Text>
                    ) : <Text type="secondary">Chưa đặt</Text>}
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
                {task.labels && task.labels.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Space wrap>
                      {task.labels.map((label) => (
                        <Tag key={label.id} color={label.color}>{label.name}</Tag>
                      ))}
                    </Space>
                  </>
                )}
              </>
            ))}

            {/* ═══════════ BÌNH LUẬN ═══════════ */}
            {activeTab === 'comments' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {rootComments.length} bình luận
                  </Text>
                  <Button size="small" icon={<ReloadOutlined />}
                    onClick={() => taskId && fetchComments(taskId)} loading={commentsLoading}>
                    Làm mới
                  </Button>
                </div>

                {commentsLoading && comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : rootComments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#bfbfbf' }}>
                    <MessageOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                  </div>
                ) : (
                  rootComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id}
                      onReply={handleReply}
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                    />
                  ))
                )}
              </>
            )}

            {/* ═══════════ TỆP ĐÍNH KÈM ═══════════ */}
            {activeTab === 'attachments' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {attachments.length} tệp
                  </Text>
                  <Space>
                    <Button size="small" icon={<ReloadOutlined />}
                      onClick={() => taskId && fetchAttachments(taskId)} loading={attachmentsLoading}>
                      Làm mới
                    </Button>
                    <Upload {...uploadProps}>
                      <Button size="small" type="primary" icon={<PaperClipOutlined />} loading={uploading}>
                        Tải lên tệp
                      </Button>
                    </Upload>
                  </Space>
                </div>

                {attachmentsLoading && attachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : attachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#bfbfbf' }}>
                    <PaperClipOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Chưa có tệp đính kèm nào
                  </div>
                ) : (
                  <List
                    dataSource={attachments}
                    renderItem={(att: Attachment) => (
                      <List.Item
                        style={{ padding: '10px 0' }}
                        actions={[
                          <Tooltip title="Tải xuống" key="dl">
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              href={att.fileUrl}
                              target="_blank"
                            />
                          </Tooltip>,
                          user?.id === att.uploadedById ? (
                            <Popconfirm
                              key="del"
                              title="Xóa tệp này?"
                              onConfirm={() => handleDeleteAttachment(att.id)}
                              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ) : null,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            att.image ? (
                              <Image
                                src={att.fileUrl}
                                width={40}
                                height={40}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                preview={{ mask: false }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {getFileIcon(att.fileType, att.fileName)}
                              </div>
                            )
                          }
                          title={
                            <Text
                              style={{ fontSize: 13, cursor: 'pointer' }}
                              onClick={() => window.open(att.fileUrl, '_blank')}
                            >
                              {att.fileName}
                            </Text>
                          }
                          description={
                            <Space size={8} style={{ fontSize: 11 }}>
                              <Text type="secondary">{att.formattedFileSize ?? `${Math.round(att.fileSize / 1024)} KB`}</Text>
                              {att.uploadedByName && (
                                <Text type="secondary">· {att.uploadedByName}</Text>
                              )}
                              <Text type="secondary">· {dayjs(att.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </>
            )}
          </div>

          {/* ═══ Input bình luận (bottom sticky) ═══ */}
          {activeTab === 'comments' && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
              {replyTo && (
                <div style={{
                  background: '#f5f5f5', borderRadius: 4, padding: '4px 10px',
                  marginBottom: 8, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Text type="secondary">
                    Đang trả lời <strong>{replyTo.userFullName || replyTo.username}</strong>
                  </Text>
                  <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setReplyTo(null)} />
                </div>
              )}
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? `Trả lời ${replyTo.userFullName || replyTo.username}...` : 'Viết bình luận... (Enter để xuống dòng, Ctrl+Enter để gửi)'}
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  style={{ borderRadius: '6px 0 0 6px' }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={commentSending}
                  disabled={!newComment.trim()}
                  onClick={handleSendComment}
                  style={{ borderRadius: '0 6px 6px 0', height: 'auto', alignSelf: 'flex-end' }}
                />
              </Space.Compact>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default TaskDetailDrawer;
