import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer, Button, Tag, Space, Typography, Spin, Form, Input, Select,
  DatePicker, Popconfirm, Divider, Descriptions, message, Avatar, Badge,
  Tabs, List, Upload, Tooltip, Checkbox, Progress, InputNumber,
  Modal, Mentions,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, CloseOutlined, SaveOutlined, UserOutlined,
  CalendarOutlined, ExclamationCircleOutlined, CommentOutlined,
  PaperClipOutlined, FolderOutlined, AppstoreOutlined, SendOutlined,
  FileOutlined, FileImageOutlined, FilePdfOutlined, FileExcelOutlined,
  FileWordOutlined, FileZipOutlined, ReloadOutlined, DownloadOutlined,
  MessageOutlined, CheckSquareOutlined, ClockCircleOutlined, LinkOutlined,
  PlusOutlined, BellOutlined, BellFilled,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { projectService } from '../services/projectService';
import { checklistService } from '../services/checklistService';
import { timeTrackingService } from '../services/timeTrackingService';
import { dependencyService } from '../services/dependencyService';
import { watcherService } from '../services/watcherService';
import RichTextEditor from './RichTextEditor';
import AuthImage from './AuthImage';
import { downloadAttachment } from '../utils/attachment';
import type {
  ProjectMember, Comment, Attachment, ChecklistItem, ChecklistSummary,
  TimeEntry, TaskDependency, MentionedUser,
} from '../types';
import { TaskPriority, TaskStatus, DependencyType } from '../types';
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

const DEP_TYPE_LABEL: Record<string, string> = {
  BLOCKS: 'Chặn',
  RELATES_TO: 'Liên quan đến',
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

// ─── CommentContent – render HTML từ Quill ──────────────
interface CommentContentProps {
  content: string;
}

const CommentContent: React.FC<CommentContentProps> = ({ content }) => {
  if (!content) return null;
  // Nếu content là plain text (không có thẻ HTML), hiển thị như cũ
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (!isHtml) return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;

  return (
    <div
      className="quill-comment-display"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

// Helper: kiểm tra Quill content có rỗng không
const isQuillEmpty = (html: string) => {
  return !html || html.replace(/<[^>]*>/g, '').trim() === '';
};


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
    if (isQuillEmpty(editContent)) return;
    setEditSaving(true);
    await onEdit(comment, editContent);
    setEditSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: depth === 0 ? 16 : 8 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar
          src={comment.userAvatar}
          icon={<UserOutlined />}
          size={depth === 0 ? 36 : 28}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
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

          {editing ? (
            <div>
              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
                style={{ marginBottom: 6 }}
              />
              <Space size={6} style={{ marginTop: 6 }}>
                <Button size="small" type="primary" loading={editSaving} onClick={handleSaveEdit}
                  disabled={isQuillEmpty(editContent)}>Lưu</Button>
                <Button size="small" onClick={() => { setEditing(false); setEditContent(comment.content); }}>
                  Hủy
                </Button>
              </Space>
            </div>
          ) : (
            <div style={{
              background: depth === 0 ? '#f5f5f5' : '#fafafa',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              wordBreak: 'break-word',
            }}>
              <CommentContent content={comment.content} />
            </div>
          )}

          {!editing && (
            <Space size={12} style={{ marginTop: 4 }}>
              {depth === 0 && (
                <Button type="link" size="small" style={{ padding: 0, fontSize: 12, height: 'auto' }}
                  onClick={() => onReply(comment)}>Trả lời</Button>
              )}
              {isOwn && (
                <>
                  <Button type="link" size="small" style={{ padding: 0, fontSize: 12, height: 'auto' }}
                    onClick={() => setEditing(true)}>Sửa</Button>
                  <Popconfirm title="Xóa bình luận này?" onConfirm={() => onDelete(comment.id)}
                    okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                    <Button type="link" size="small" danger style={{ padding: 0, fontSize: 12, height: 'auto' }}>
                      Xóa
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId}
                  depth={1} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />
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
  const drawerWidth = window.innerWidth < 768 ? window.innerWidth : Math.min(640, window.innerWidth - 48);
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

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Comments
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentSending, setCommentSending] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionedUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistSummary | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [addingCheckItem, setAddingCheckItem] = useState(false);

  // Time Tracking
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeLoading, setTimeLoading] = useState(false);
  const [timeTotal, setTimeTotal] = useState<number>(0);
  const [addTimeModal, setAddTimeModal] = useState(false);
  const [timeForm] = Form.useForm();
  const [timeSaving, setTimeSaving] = useState(false);
  const [editTimeEntry, setEditTimeEntry] = useState<TimeEntry | null>(null);
  const [editTimeForm] = Form.useForm();

  // Dependencies
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [addDepModal, setAddDepModal] = useState(false);
  const [depForm] = Form.useForm();
  const [depSaving, setDepSaving] = useState(false);

  // Watchers
  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  const open = !!taskId;
  const task = currentTask?.id === taskId ? currentTask : null;

  // ── Fetch task khi mở ──────────────────────────────────────
  useEffect(() => {
    if (taskId) {
      setEditMode(false);
      setActiveTab('detail');
      setMembers([]);
      setCommentContent('');
      setReplyTo(null);
      setMentionSuggestions([]);
      setChecklist(null);
      setTimeEntries([]);
      setDependencies([]);
      fetchTaskById(taskId);
      fetchWatchStatus(taskId);
    }
  }, [taskId]);

  // ── Fetch theo tab ─────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    if (activeTab === 'comments') fetchComments(taskId);
    if (activeTab === 'attachments') fetchAttachments(taskId);
    if (activeTab === 'checklist') fetchChecklist(taskId);
    if (activeTab === 'time') fetchTimeEntries(taskId);
    if (activeTab === 'dependencies') fetchDependencies(taskId);
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

  const fetchWatchStatus = async (id: string) => {
    try {
      const { watching: w } = await watcherService.getStatus(id);
      setWatching(w);
    } catch { /* ignore */ }
  };

  const fetchChecklist = useCallback(async (id: string) => {
    setChecklistLoading(true);
    try {
      const data = await checklistService.getChecklist(id);
      setChecklist(data);
    } catch { /* ignore */ } finally {
      setChecklistLoading(false);
    }
  }, []);

  const fetchTimeEntries = useCallback(async (id: string) => {
    setTimeLoading(true);
    try {
      const [entries, total] = await Promise.all([
        timeTrackingService.getByTask(id),
        timeTrackingService.getTotalByTask(id),
      ]);
      setTimeEntries(entries);
      setTimeTotal(total.totalHours ?? 0);
    } catch { /* ignore */ } finally {
      setTimeLoading(false);
    }
  }, []);

  const fetchDependencies = useCallback(async (id: string) => {
    setDepsLoading(true);
    try {
      const data = await dependencyService.getDependencies(id);
      setDependencies(data);
    } catch { /* ignore */ } finally {
      setDepsLoading(false);
    }
  }, []);

  // ── Edit task ─────────────────────────────────────────────
  const handleEnterEdit = () => {
    if (!task) return;
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigneeId: task.assigneeId ?? null,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      startDate: task.startDate ? dayjs(task.startDate) : null,
      estimatedHours: task.estimatedHours,
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
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        estimatedHours: values.estimatedHours,
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
    setCommentContent('');
    setReplyTo(null);
    setMentionSuggestions([]);
    setCurrentTask(null);
    onClose();
  };

  // ── Comments ──────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!taskId || !commentContent.trim()) return;
    setCommentSending(true);
    try {
      await addComment(taskId, { content: commentContent, parentId: replyTo?.id });
      setCommentContent('');
      setReplyTo(null);
      setMentionSuggestions([]);
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
  };

  const handleMentionSearch = useCallback(async (keyword: string) => {
    if (!task?.projectId) return;
    setMentionLoading(true);
    try {
      const results = await projectService.searchMembers(task.projectId, keyword);
      setMentionSuggestions(results ?? []);
    } catch {
      setMentionSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  }, [task?.projectId]);

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
      return false;
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

  // ── Checklist ─────────────────────────────────────────────
  const handleAddCheckItem = async () => {
    if (!taskId || !newCheckItem.trim()) return;
    setAddingCheckItem(true);
    try {
      await checklistService.addItem(taskId, { content: newCheckItem.trim() });
      setNewCheckItem('');
      fetchChecklist(taskId);
    } catch (e: any) {
      message.error(e.message || 'Thêm item thất bại');
    } finally {
      setAddingCheckItem(false);
    }
  };

  const handleToggleCheckItem = async (item: ChecklistItem) => {
    if (!taskId) return;
    try {
      await checklistService.updateItem(item.id, { isChecked: !item.isChecked });
      fetchChecklist(taskId);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    }
  };

  const handleDeleteCheckItem = async (id: string) => {
    if (!taskId) return;
    try {
      await checklistService.deleteItem(id);
      fetchChecklist(taskId);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  // ── Time Tracking ─────────────────────────────────────────
  const handleAddTime = async (values: any) => {
    if (!taskId) return;
    setTimeSaving(true);
    try {
      await timeTrackingService.logTime({
        taskId,
        hours: values.hours,
        description: values.description,
        workDate: values.workDate.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận giờ làm');
      setAddTimeModal(false);
      timeForm.resetFields();
      await fetchTimeEntries(taskId);
      fetchTaskById(taskId); // refresh actualHours trên task
    } catch (e: any) {
      message.error(e.message || 'Ghi nhận thất bại');
    } finally {
      setTimeSaving(false);
    }
  };

  const handleDeleteTimeEntry = async (id: string) => {
    if (!taskId) return;
    try {
      await timeTrackingService.delete(id);
      message.success('Đã xóa mục');
      await fetchTimeEntries(taskId);
      fetchTaskById(taskId);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleOpenEditTime = (entry: TimeEntry) => {
    setEditTimeEntry(entry);
    editTimeForm.setFieldsValue({
      hours: entry.hours,
      workDate: dayjs(entry.workDate),
      description: entry.description,
    });
  };

  const handleSaveEditTime = async (values: any) => {
    if (!editTimeEntry || !taskId) return;
    setTimeSaving(true);
    try {
      await timeTrackingService.update(editTimeEntry.id, {
        hours: values.hours,
        description: values.description,
        workDate: values.workDate.format('YYYY-MM-DD'),
      });
      message.success('Đã cập nhật');
      setEditTimeEntry(null);
      editTimeForm.resetFields();
      await fetchTimeEntries(taskId);
      fetchTaskById(taskId);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally {
      setTimeSaving(false);
    }
  };

  // ── Dependencies ──────────────────────────────────────────
  const handleAddDependency = async (values: any) => {
    if (!taskId) return;
    setDepSaving(true);
    try {
      await dependencyService.addDependency(taskId, {
        dependsOnTaskId: values.dependsOnTaskId.trim(),
        type: values.type,
      });
      message.success('Đã thêm phụ thuộc');
      setAddDepModal(false);
      depForm.resetFields();
      fetchDependencies(taskId);
    } catch (e: any) {
      message.error(e.message || 'Thêm phụ thuộc thất bại');
    } finally {
      setDepSaving(false);
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    if (!taskId) return;
    try {
      await dependencyService.deleteDependency(taskId, depId);
      message.success('Đã xóa phụ thuộc');
      fetchDependencies(taskId);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  // ── Watchers ──────────────────────────────────────────────
  const handleToggleWatch = async () => {
    if (!taskId) return;
    setWatchLoading(true);
    try {
      if (watching) {
        await watcherService.unwatch(taskId);
        setWatching(false);
        message.success('Đã bỏ theo dõi task');
      } else {
        await watcherService.watch(taskId);
        setWatching(true);
        message.success('Đang theo dõi task');
      }
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setWatchLoading(false);
    }
  };

  // ── Member options for assignee ───────────────────────────
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

  const rootComments = comments.filter((c) => !c.parentId);

  // ── Tabs ──────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'detail',
      label: 'Chi tiết',
      children: null,
    },
    {
      key: 'checklist',
      label: (
        <Space size={4}>
          <CheckSquareOutlined />
          Checklist
          {checklist && checklist.totalItems > 0 && (
            <Badge count={`${checklist.checkedItems}/${checklist.totalItems}`} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      ),
      children: null,
    },
    {
      key: 'comments',
      label: (
        <Space size={4}>
          <CommentOutlined />
          Bình luận
          {task && (task.commentCount ?? 0) > 0 && (
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
          {task && (task.attachmentCount ?? 0) > 0 && (
            <Badge count={task.attachmentCount} size="small" color="#52c41a" />
          )}
        </Space>
      ),
      children: null,
    },
    {
      key: 'time',
      label: (
        <Space size={4}>
          <ClockCircleOutlined />
          Giờ làm
        </Space>
      ),
      children: null,
    },
    {
      key: 'dependencies',
      label: (
        <Space size={4}>
          <LinkOutlined />
          Liên kết
          {dependencies.length > 0 && (
            <Badge count={dependencies.length} size="small" color="#722ed1" />
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
      width={drawerWidth}
      styles={{ body: { padding: '0 0 0 0', display: 'flex', flexDirection: 'column', height: '100%' } }}
      title={
        task ? (
          <Space size={8} wrap>
            <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.taskKey}</Tag>
            <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0 }}>
              {PRIORITY_LABEL[task.priority]}
            </Tag>
            <StatusTag status={task.status} />
            {task.overdue && (
              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0 }}>Quá hạn</Tag>
            )}
          </Space>
        ) : 'Chi tiết task'
      }
      extra={
        task ? (
          <Space>
            <Tooltip title={watching ? 'Bỏ theo dõi' : 'Theo dõi task'}>
              <Button
                size="small"
                icon={watching ? <BellFilled style={{ color: '#1890ff' }} /> : <BellOutlined />}
                onClick={handleToggleWatch}
                loading={watchLoading}
              />
            </Tooltip>
            {activeTab === 'detail' && !editMode && (
              <>
                <Button icon={<EditOutlined />} size="small" onClick={handleEnterEdit}>Sửa</Button>
                <Popconfirm
                  title="Xóa task này?" description="Hành động này không thể hoàn tác."
                  onConfirm={handleDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} size="small">Xóa</Button>
                </Popconfirm>
              </>
            )}
            {activeTab === 'detail' && editMode && (
              <>
                <Button icon={<SaveOutlined />} type="primary" size="small" loading={saving}
                  onClick={() => form.submit()}>Lưu</Button>
                <Button icon={<CloseOutlined />} size="small" onClick={() => setEditMode(false)}>Hủy</Button>
              </>
            )}
          </Space>
        ) : null
      }
    >
      {isLoading && !task ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      ) : !task ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => { setActiveTab(k); setEditMode(false); }}
            items={tabItems}
            style={{ paddingLeft: 24, paddingRight: 24 }}
            tabBarStyle={{ marginBottom: 0 }}
          />
          <Divider style={{ margin: 0 }} />

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

            {/* ═══════════ CHI TIẾT ═══════════ */}
            {activeTab === 'detail' && (editMode ? (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Form.Item name="title" label="Tiêu đề"
                  rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                  <Input placeholder="Tiêu đề task" maxLength={500} />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={4} placeholder="Mô tả chi tiết..." maxLength={5000} />
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
                <Space style={{ width: '100%' }}>
                  <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item name="dueDate" label="Hạn chót" style={{ flex: 1 }}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Space>
                <Form.Item name="estimatedHours" label="Giờ ước tính">
                  <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="VD: 8" />
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
                  <Descriptions.Item label="Giờ (ước tính/thực)">
                    <Space>
                      <Text>{task.estimatedHours ?? '—'} giờ dự kiến</Text>
                      <Text type="secondary">/</Text>
                      <Text style={{ color: '#1890ff' }}>{task.actualHours ?? 0} giờ thực tế</Text>
                    </Space>
                  </Descriptions.Item>
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

                {/* ── Parent task ── */}
                {task.parentTaskId && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Task cha</Text>
                      <div style={{
                        marginTop: 6, padding: '8px 12px',
                        background: '#f5f5f5', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.parentTaskKey}</Tag>
                        <Text style={{ fontSize: 13 }}>{task.parentTaskTitle}</Text>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Subtasks ── */}
                {task.subTasks && task.subTasks.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Subtasks ({task.subTasks.length})
                      </Text>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {task.subTasks.map((sub) => (
                          <div key={sub.id} style={{
                            padding: '8px 12px', background: '#fafafa',
                            borderRadius: 6, border: '1px solid #f0f0f0',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{sub.taskKey}</Tag>
                            <Text style={{ flex: 1, fontSize: 13 }} ellipsis={{ tooltip: sub.title }}>
                              {sub.title}
                            </Text>
                            {sub.assigneeName && (
                              <Text type="secondary" style={{ fontSize: 12 }}>{sub.assigneeName}</Text>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ))}

            {/* ═══════════ CHECKLIST ═══════════ */}
            {activeTab === 'checklist' && (
              <>
                {checklistLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : (
                  <>
                    {checklist && checklist.totalItems > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {checklist.checkedItems}/{checklist.totalItems} hoàn thành
                          </Text>
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                            {checklist.completionPercentage}%
                          </Text>
                        </div>
                        <Progress
                          percent={checklist.completionPercentage}
                          showInfo={false}
                          strokeColor="#52c41a"
                          size="small"
                        />
                      </div>
                    )}
                    <div style={{ marginBottom: 16 }}>
                      {checklist?.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0', borderBottom: '1px solid #f0f0f0',
                          }}
                        >
                          <Checkbox
                            checked={item.isChecked}
                            onChange={() => handleToggleCheckItem(item)}
                          />
                          <Text
                            style={{
                              flex: 1, fontSize: 13,
                              textDecoration: item.isChecked ? 'line-through' : 'none',
                              color: item.isChecked ? '#8c8c8c' : undefined,
                            }}
                          >
                            {item.content}
                          </Text>
                          {item.checkedByName && item.isChecked && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {item.checkedByName}
                            </Text>
                          )}
                          <Popconfirm
                            title="Xóa item này?"
                            onConfirm={() => handleDeleteCheckItem(item.id)}
                            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      ))}
                    </div>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        placeholder="Thêm mục việc cần làm..."
                        onPressEnter={handleAddCheckItem}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={addingCheckItem}
                        disabled={!newCheckItem.trim()}
                        onClick={handleAddCheckItem}
                      >
                        Thêm
                      </Button>
                    </Space.Compact>
                  </>
                )}
              </>
            )}

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
                  <Text type="secondary" style={{ fontSize: 13 }}>{attachments.length} tệp</Text>
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
                            <Button type="text" size="small" icon={<DownloadOutlined />}
                              onClick={() => downloadAttachment(att.id, att.fileName).catch(() => message.error('Tải xuống thất bại'))} />
                          </Tooltip>,
                          user?.id === att.uploadedById ? (
                            <Popconfirm key="del" title="Xóa tệp này?"
                              onConfirm={() => handleDeleteAttachment(att.id)}
                              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ) : null,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            (att.isImage || att.image) ? (
                              <AuthImage
                                attachmentId={att.id}
                                fileName={att.fileName}
                                style={{ width: 40, height: 40, borderRadius: 4, cursor: 'pointer' }}
                                onClick={() => {
                                  const token = localStorage.getItem('access_token');
                                  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
                                  window.open(`${base}/attachments/${att.id}/inline?token=${encodeURIComponent(token ?? '')}`, '_blank');
                                }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {getFileIcon(att.fileType, att.fileName)}
                              </div>
                            )
                          }
                          title={
                            <Text style={{ fontSize: 13, cursor: 'pointer' }}
                              onClick={() => downloadAttachment(att.id, att.fileName).catch(() => message.error('Tải xuống thất bại'))}>
                              {att.fileName}
                            </Text>
                          }
                          description={
                            <Space size={8} style={{ fontSize: 11 }}>
                              <Text type="secondary">{att.formattedFileSize ?? `${Math.round(att.fileSize / 1024)} KB`}</Text>
                              {att.uploadedByName && <Text type="secondary">· {att.uploadedByName}</Text>}
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

            {/* ═══════════ GIỜ LÀM VIỆC ═══════════ */}
            {activeTab === 'time' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Space>
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Tổng: {task.actualHours ?? timeTotal} giờ</Text>
                    {task.estimatedHours && (
                      <Text type="secondary">/ {task.estimatedHours} giờ ước tính</Text>
                    )}
                  </Space>
                  <Button type="primary" icon={<PlusOutlined />} size="small"
                    onClick={() => { timeForm.resetFields(); setAddTimeModal(true); }}>
                    Ghi nhận giờ
                  </Button>
                </div>

                {task.estimatedHours && (
                  <Progress
                    percent={Math.min(Math.round(((task.actualHours ?? timeTotal) / task.estimatedHours) * 100), 100)}
                    strokeColor={(task.actualHours ?? timeTotal) > task.estimatedHours ? '#f5222d' : '#1890ff'}
                    size="small"
                    style={{ marginBottom: 16 }}
                  />
                )}

                {timeLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : timeEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#bfbfbf' }}>
                    <ClockCircleOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Chưa có nhật ký giờ làm nào
                  </div>
                ) : (
                  <List
                    dataSource={timeEntries}
                    renderItem={(entry) => (
                      <List.Item
                        style={{ padding: '10px 0' }}
                        actions={
                          user?.id === entry.userId
                            ? [
                                <Tooltip title="Sửa" key="edit">
                                  <Button type="text" size="small" icon={<EditOutlined />}
                                    onClick={() => handleOpenEditTime(entry)} />
                                </Tooltip>,
                                <Popconfirm key="del" title="Xóa mục này?"
                                  onConfirm={() => handleDeleteTimeEntry(entry.id)}
                                  okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>,
                              ]
                            : []
                        }
                      >
                        <List.Item.Meta
                          avatar={<Avatar size={32} icon={<UserOutlined />} />}
                          title={
                            <Space>
                              <Text strong style={{ fontSize: 13 }}>{entry.hours ?? 0} giờ</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                · {entry.userFullName || entry.username}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                · {dayjs(entry.workDate).format('DD/MM/YYYY')}
                              </Text>
                            </Space>
                          }
                          description={entry.description || <Text type="secondary" style={{ fontSize: 12 }}>Không có mô tả</Text>}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </>
            )}

            {/* ═══════════ LIÊN KẾT / DEPENDENCIES ═══════════ */}
            {activeTab === 'dependencies' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {dependencies.length} liên kết
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} size="small"
                    onClick={() => { depForm.resetFields(); setAddDepModal(true); }}>
                    Thêm liên kết
                  </Button>
                </div>

                {depsLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : dependencies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#bfbfbf' }}>
                    <LinkOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    Chưa có liên kết nào
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dependencies.map((dep) => (
                      <div key={dep.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', background: '#fafafa',
                        borderRadius: 6, border: '1px solid #f0f0f0',
                      }}>
                        <Tag color="purple" style={{ margin: 0 }}>{DEP_TYPE_LABEL[dep.type] || dep.type}</Tag>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{dep.dependsOnTaskKey}</Tag>
                        <Text style={{ flex: 1, fontSize: 13 }} ellipsis={{ tooltip: dep.dependsOnTaskTitle }}>
                          {dep.dependsOnTaskTitle}
                        </Text>
                        <Popconfirm
                          title="Xóa liên kết này?"
                          onConfirm={() => handleDeleteDependency(dep.id)}
                          okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
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
              <Mentions
                value={commentContent}
                onChange={setCommentContent}
                onSearch={handleMentionSearch}
                loading={mentionLoading}
                placeholder={replyTo
                  ? `Trả lời ${replyTo.userFullName || replyTo.username}... (dùng @ để mention)`
                  : 'Viết bình luận... (dùng @ để mention người khác)'}
                autoSize={{ minRows: 3, maxRows: 8 }}
                style={{ marginBottom: 4, width: '100%' }}
                options={mentionSuggestions.map((u) => ({
                  value: u.username,
                  label: (
                    <Space size={6}>
                      <Avatar size={18} src={u.avatarUrl} icon={<UserOutlined />} />
                      <span>{u.fullName || u.username}</span>
                      <Text type="secondary" style={{ fontSize: 11 }}>@{u.username}</Text>
                    </Space>
                  ),
                }))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Gõ @ để tag người khác</Text>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={commentSending}
                  disabled={!commentContent.trim()}
                  onClick={handleSendComment}
                >
                  Gửi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal ghi nhận giờ */}
      <Modal
        title={<Space><ClockCircleOutlined />Ghi nhận giờ làm việc</Space>}
        open={addTimeModal}
        onCancel={() => setAddTimeModal(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={timeForm} layout="vertical" onFinish={handleAddTime} style={{ marginTop: 8 }}>
          <Form.Item name="hours" label="Số giờ"
            rules={[{ required: true, message: 'Vui lòng nhập số giờ' }]}>
            <InputNumber min={0.1} max={24} step={0.5} style={{ width: '100%' }} placeholder="VD: 2.5" />
          </Form.Item>
          <Form.Item name="workDate" label="Ngày làm việc"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
            initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả công việc">
            <TextArea rows={3} placeholder="Đã làm gì hôm nay..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={timeSaving}>Ghi nhận</Button>
            <Button onClick={() => setAddTimeModal(false)}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal sửa time entry */}
      <Modal
        title={<Space><EditOutlined />Sửa nhật ký giờ làm</Space>}
        open={!!editTimeEntry}
        onCancel={() => { setEditTimeEntry(null); editTimeForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editTimeForm} layout="vertical" onFinish={handleSaveEditTime} style={{ marginTop: 8 }}>
          <Form.Item name="hours" label="Số giờ"
            rules={[{ required: true, message: 'Vui lòng nhập số giờ' }]}>
            <InputNumber min={0.1} max={24} step={0.5} style={{ width: '100%' }} placeholder="VD: 2.5" />
          </Form.Item>
          <Form.Item name="workDate" label="Ngày làm việc"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả công việc">
            <TextArea rows={3} placeholder="Đã làm gì hôm nay..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={timeSaving}>Lưu thay đổi</Button>
            <Button onClick={() => { setEditTimeEntry(null); editTimeForm.resetFields(); }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal thêm dependency */}
      <Modal
        title={<Space><LinkOutlined />Thêm liên kết task</Space>}
        open={addDepModal}
        onCancel={() => setAddDepModal(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={depForm} layout="vertical" onFinish={handleAddDependency} style={{ marginTop: 8 }}>
          <Form.Item name="type" label="Loại liên kết"
            rules={[{ required: true, message: 'Chọn loại liên kết' }]}
            initialValue={DependencyType.RELATES_TO}>
            <Select options={Object.entries(DEP_TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="dependsOnTaskId" label="Task ID liên kết"
            rules={[{ required: true, message: 'Vui lòng nhập Task ID' }]}>
            <Input placeholder="Nhập UUID của task cần liên kết" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={depSaving}>Thêm liên kết</Button>
            <Button onClick={() => setAddDepModal(false)}>Hủy</Button>
          </Space>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default TaskDetailDrawer;
