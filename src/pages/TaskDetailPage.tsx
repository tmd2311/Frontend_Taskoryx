import React, { useEffect, useState, useCallback } from 'react';
import {
  Button, Tag, Space, Typography, Spin, Form, Input, Select,
  DatePicker, Popconfirm, Divider, message, Avatar, Badge,
  List, Upload, Tooltip, Checkbox, Progress, InputNumber,
  Modal, Card, Result,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, SaveOutlined, UserOutlined,
  CalendarOutlined, ExclamationCircleOutlined, CommentOutlined,
  PaperClipOutlined, FolderOutlined, AppstoreOutlined, SendOutlined,
  FileOutlined, FileImageOutlined, FilePdfOutlined, FileExcelOutlined,
  FileWordOutlined, FileZipOutlined, ReloadOutlined, DownloadOutlined,
  MessageOutlined, CheckSquareOutlined, ClockCircleOutlined, LinkOutlined,
  PlusOutlined, BellOutlined, BellFilled, ArrowLeftOutlined,
  CloseOutlined, BoldOutlined, ItalicOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, CodeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { checklistService } from '../services/checklistService';
import { timeTrackingService } from '../services/timeTrackingService';
import { dependencyService } from '../services/dependencyService';
import { watcherService } from '../services/watcherService';
import { useMentionInput } from '../hooks/useMentionInput';
import AuthImage from '../components/AuthImage';
import { downloadAttachment } from '../utils/attachment';
import type {
  Task, ProjectMember, Comment, Attachment, ChecklistItem, ChecklistSummary,
  TimeEntry, TaskDependency, MentionedUser,
} from '../types';
import { TaskPriority, TaskStatus, DependencyType } from '../types';
import StatusSelect from '../components/StatusSelect';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green', [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange', [TaskPriority.URGENT]: 'red',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp', [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao', [TaskPriority.URGENT]: 'Khẩn cấp',
};
const DEP_TYPE_LABEL: Record<string, string> = {
  BLOCKS: 'Chặn',
  RELATES_TO: 'Liên quan đến',
};

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

// ─── CommentContent ──────────────────────────────────────────
const CommentContent: React.FC<{ content: string; mentionedUsers?: MentionedUser[] }> = ({
  content, mentionedUsers = [],
}) => {
  if (!content) return null;
  if (mentionedUsers.length === 0) return <span>{content}</span>;

  const parts: Array<{ type: 'text'; value: string } | { type: 'mention'; user: MentionedUser }> = [];
  let remaining = content;
  const sorted = [...mentionedUsers].sort((a, b) =>
    content.indexOf(`@${a.username}`) - content.indexOf(`@${b.username}`)
  );
  sorted.forEach((user) => {
    const tag = `@${user.username}`;
    const idx = remaining.indexOf(tag);
    if (idx === -1) return;
    if (idx > 0) parts.push({ type: 'text', value: remaining.slice(0, idx) });
    parts.push({ type: 'mention', user });
    remaining = remaining.slice(idx + tag.length);
  });
  if (remaining) parts.push({ type: 'text', value: remaining });

  return (
    <span>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <Tooltip key={i} title={part.user.fullName}>
            <Tag color="blue" style={{ margin: '0 2px', cursor: 'default', fontSize: 12, padding: '0 5px' }}>
              @{part.user.username}
            </Tag>
          </Tooltip>
        ),
      )}
    </span>
  );
};

// ─── CommentItem ─────────────────────────────────────────────
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
    <div style={{ marginBottom: depth === 0 ? 12 : 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar src={comment.userAvatar} icon={<UserOutlined />} size={depth === 0 ? 30 : 24}
          style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={6} style={{ marginBottom: 3 }}>
            <Text strong style={{ fontSize: depth === 0 ? 13 : 12 }}>
              {comment.userFullName || comment.username}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(comment.createdAt).fromNow()}</Text>
            {comment.isEdited && (
              <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>(đã sửa)</Text>
            )}
          </Space>
          {editing ? (
            <div>
              <TextArea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                autoSize={{ minRows: 2 }} style={{ marginBottom: 6 }} />
              <Space size={6}>
                <Button size="small" type="primary" loading={editSaving} onClick={handleSaveEdit}
                  disabled={!editContent.trim()}>Lưu</Button>
                <Button size="small" onClick={() => { setEditing(false); setEditContent(comment.content); }}>Hủy</Button>
              </Space>
            </div>
          ) : (
            <div style={{
              background: depth === 0 ? '#f5f5f5' : '#fafafa',
              borderRadius: 8, padding: '6px 10px', fontSize: 13,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              <CommentContent content={comment.content} mentionedUsers={comment.mentionedUsers} />
            </div>
          )}
          {!editing && (
            <Space size={10} style={{ marginTop: 3 }}>
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
                    <Button type="link" size="small" danger style={{ padding: 0, fontSize: 12, height: 'auto' }}>Xóa</Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
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

// ─── TaskDetailPage ───────────────────────────────────────────
const TaskDetailPage: React.FC = () => {
  const { taskKey } = useParams<{ taskKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    updateTask, updateTaskStatus, deleteTask,
    comments, commentsLoading, fetchComments, addComment, updateComment, deleteComment,
    attachments, attachmentsLoading, fetchAttachments, uploadAttachment, deleteAttachment,
  } = useTaskStore();

  const [loading, setLoading] = useState(true);
  const [keyError, setKeyError] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentSending, setCommentSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [checklist, setChecklist] = useState<ChecklistSummary | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [addingCheckItem, setAddingCheckItem] = useState(false);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeLoading, setTimeLoading] = useState(false);
  const [timeTotal, setTimeTotal] = useState<number>(0);
  const [addTimeModal, setAddTimeModal] = useState(false);
  const [timeForm] = Form.useForm();
  const [timeSaving, setTimeSaving] = useState(false);
  const [editTimeEntry, setEditTimeEntry] = useState<TimeEntry | null>(null);
  const [editTimeForm] = Form.useForm();

  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [addDepModal, setAddDepModal] = useState(false);
  const [depForm] = Form.useForm();
  const [depSaving, setDepSaving] = useState(false);

  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  const [isWide, setIsWide] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mention = useMentionInput(task?.projectId ?? undefined);

  // Fetch task by key on mount / key change
  useEffect(() => {
    if (!taskKey) return;
    let cancelled = false;
    setLoading(true);
    setKeyError(false);
    setTask(null);
    setEditMode(false);
    setMembers([]);
    setReplyTo(null);
    setChecklist(null);
    setTimeEntries([]);
    setDependencies([]);

    taskService.getTaskByKey(taskKey)
      .then((t) => {
        if (cancelled) return;
        setTask(t);
        fetchWatchStatus(t.id);
      })
      .catch(() => { if (!cancelled) setKeyError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [taskKey]);

  // Auto-load comments + dependencies when task loads
  useEffect(() => {
    if (!task?.id) return;
    fetchComments(task.id);
    fetchDependencies(task.id);
  }, [task?.id]);

  // Fetch attachments and checklist on task load (always visible in new layout)
  useEffect(() => {
    if (!task?.id) return;
    fetchAttachments(task.id);
    fetchChecklist(task.id);
  }, [task?.id]);

  // Load members khi task có projectId
  useEffect(() => {
    if (!task?.projectId) return;
    setMembersLoading(true);
    projectService.getMembers(task.projectId)
      .then(setMembers).catch(() => { })
      .finally(() => setMembersLoading(false));
  }, [task?.projectId]);

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
    } catch { /* ignore */ } finally { setChecklistLoading(false); }
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
    } catch { /* ignore */ } finally { setTimeLoading(false); }
  }, []);

  const fetchDependencies = useCallback(async (id: string) => {
    setDepsLoading(true);
    try {
      const data = await dependencyService.getDependencies(id);
      setDependencies(data);
    } catch { /* ignore */ } finally { setDepsLoading(false); }
  }, []);

  const handleEnterEdit = () => {
    if (!task) return;
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      startDate: task.startDate ? dayjs(task.startDate) : null,
      estimatedHours: task.estimatedHours,
    });
    setEditMode(true);
  };

  const handleSave = async (values: any) => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const updated = await updateTask(task.id, {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        estimatedHours: values.estimatedHours,
      });
      setTask(updated);
      message.success('Đã cập nhật task');
      setEditMode(false);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    try {
      await deleteTask(task?.id);
      message.success('Đã xóa task');
      navigate(-1);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleChangeAssignee = async (assigneeId: string | null) => {
    if (!task?.id) return;
    try {
      const updated = await updateTask(task.id, { assigneeId: assigneeId ?? undefined });
      setTask(updated);
      message.success('Đã cập nhật người thực hiện');
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    }
  };

  const handleSendComment = async () => {
    if (!task?.id || !mention.content.trim()) return;
    setCommentSending(true);
    try {
      await addComment(task?.id, { content: mention.content.trim(), parentId: replyTo?.id });
      mention.reset();
      setReplyTo(null);
    } catch (e: any) {
      message.error(e.message || 'Gửi bình luận thất bại');
    } finally { setCommentSending(false); }
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
    setTimeout(() => mention.textareaRef.current?.focus(), 100);
  };

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: async (file) => {
      if (!task?.id) return false;
      if (file.size > 10 * 1024 * 1024) { message.error('File không được vượt quá 10MB'); return false; }
      setUploading(true);
      try {
        await uploadAttachment(task?.id, file);
        message.success(`Đã tải lên "${file.name}"`);
      } catch (e: any) {
        message.error(e.message || 'Tải lên thất bại');
      } finally { setUploading(false); }
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

  const handleAddCheckItem = async () => {
    if (!task?.id || !newCheckItem.trim()) return;
    setAddingCheckItem(true);
    try {
      await checklistService.addItem(task?.id, { content: newCheckItem.trim() });
      setNewCheckItem('');
      fetchChecklist(task?.id);
    } catch (e: any) {
      message.error(e.message || 'Thêm item thất bại');
    } finally { setAddingCheckItem(false); }
  };

  const handleToggleCheckItem = async (item: ChecklistItem) => {
    if (!task?.id) return;
    try {
      await checklistService.updateItem(item.id, { isChecked: !item.isChecked });
      fetchChecklist(task?.id);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    }
  };

  const handleDeleteCheckItem = async (id: string) => {
    if (!task?.id) return;
    try {
      await checklistService.deleteItem(id);
      fetchChecklist(task?.id);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleAddTime = async (values: any) => {
    if (!task?.id) return;
    setTimeSaving(true);
    try {
      await timeTrackingService.logTime({
        taskId: task?.id,
        hours: values.hours,
        description: values.description,
        workDate: values.workDate.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận giờ làm');
      setAddTimeModal(false);
      timeForm.resetFields();
      await fetchTimeEntries(task?.id);
      if (task?.id) taskService.getTaskById(task.id).then(setTask).catch(() => { });
    } catch (e: any) {
      message.error(e.message || 'Ghi nhận thất bại');
    } finally { setTimeSaving(false); }
  };

  const handleDeleteTimeEntry = async (id: string) => {
    if (!task?.id) return;
    try {
      await timeTrackingService.delete(id);
      message.success('Đã xóa mục');
      await fetchTimeEntries(task?.id);
      if (task?.id) taskService.getTaskById(task.id).then(setTask).catch(() => { });
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
    if (!editTimeEntry || !task?.id) return;
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
      await fetchTimeEntries(task?.id);
      if (task?.id) taskService.getTaskById(task.id).then(setTask).catch(() => { });
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally { setTimeSaving(false); }
  };

  const handleAddDependency = async (values: any) => {
    if (!task?.id) return;
    setDepSaving(true);
    try {
      await dependencyService.addDependency(task?.id, {
        dependsOnTaskId: values.dependsOnTaskId.trim(),
        type: values.type,
      });
      message.success('Đã thêm phụ thuộc');
      setAddDepModal(false);
      depForm.resetFields();
      fetchDependencies(task?.id);
    } catch (e: any) {
      message.error(e.message || 'Thêm phụ thuộc thất bại');
    } finally { setDepSaving(false); }
  };

  const handleDeleteDependency = async (depId: string) => {
    if (!task?.id) return;
    try {
      await dependencyService.deleteDependency(task?.id, depId);
      message.success('Đã xóa phụ thuộc');
      fetchDependencies(task?.id);
    } catch (e: any) {
      message.error(e.message || 'Xóa thất bại');
    }
  };

  const handleToggleWatch = async () => {
    if (!task?.id) return;
    setWatchLoading(true);
    try {
      if (watching) {
        await watcherService.unwatch(task?.id);
        setWatching(false);
        message.success('Đã bỏ theo dõi task');
      } else {
        await watcherService.watch(task?.id);
        setWatching(true);
        message.success('Đang theo dõi task');
      }
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally { setWatchLoading(false); }
  };

  const memberOptions = members.map((m) => ({
    label: (
      <Space size={8}>
        <Avatar size={20} src={m.avatarUrl} icon={<UserOutlined />} />
        <span>{m.fullName || m.username}</span>
        <Text type="secondary" style={{ fontSize: 11 }}>{m.email}</Text>
      </Space>
    ),
    value: m.userId,
  }));

  const rootComments = comments.filter((c) => !c.parentId);

  // State for collapsible sections and comment UI
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [timeOpen, setTimeOpen] = useState(false);
  const [notifyTo, setNotifyTo] = useState('');
  const [commentPreview, setCommentPreview] = useState(false);

  // Insert formatting around textarea selection
  const insertFormat = (before: string, after: string = before) => {
    const textarea = mention.textareaRef.current as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const val = mention.content;
    const selected = val.slice(start, end);
    const newVal = val.slice(0, start) + before + selected + after + val.slice(end);
    // Trigger onChange via synthetic event
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, newVal);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Move cursor inside formatting marks
    setTimeout(() => {
      const pos = start + before.length + selected.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: <BoldOutlined />, title: 'Bold', before: '**', after: '**' },
    { icon: <ItalicOutlined />, title: 'Italic', before: '_', after: '_' },
    { icon: <StrikethroughOutlined />, title: 'Strikethrough', before: '~~', after: '~~' },
    { icon: <UnorderedListOutlined />, title: 'Bullet list', before: '- ', after: '' },
    { icon: <OrderedListOutlined />, title: 'Numbered list', before: '1. ', after: '' },
    { icon: <CodeOutlined />, title: 'Code', before: '`', after: '`' },
    { icon: <span style={{ fontWeight: 700, fontSize: 12 }}>"</span>, title: 'Quote', before: '> ', after: '' },
    { icon: <LinkOutlined />, title: 'Link', before: '[', after: '](url)' },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" tip="Đang tải task..." />
      </div>
    );
  }

  if (keyError) {
    return (
      <Result
        status="404"
        title="Không tìm thấy task"
        subTitle={`Mã task "${taskKey}" không tồn tại hoặc bạn không có quyền truy cập.`}
        extra={<Button type="primary" onClick={() => navigate(-1)}>Quay lại</Button>}
      />
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>

      {task && (
        <>
          {/* ══════════════════════════════════════════════════
              HEADER BAR  (Redmine/Backlog style)
          ══════════════════════════════════════════════════ */}
          <div style={{
            background: 'var(--header-bar-bg, #f5f6fa)',
            borderBottom: '1px solid var(--header-bar-border, #e8eaf0)',
            borderRadius: '12px 12px 0 0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            {/* Left: back + key + overdue + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Button
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={() => navigate(-1)}
                style={{ flexShrink: 0 }}
              />
              <Tag style={{ fontFamily: 'monospace', margin: 0, fontSize: 12, flexShrink: 0 }}>
                {task.taskKey}
              </Tag>
              {task.overdue && (
                <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ margin: 0, flexShrink: 0 }}>
                  Quá hạn
                </Tag>
              )}
              <Title level={5} style={{ margin: 0, lineHeight: 1.4, flex: 1, minWidth: 0, fontSize: 15 }}>
                {task.title}
              </Title>
            </div>

            {/* Right: dates info + watch + edit/save/cancel + delete */}
            <Space size={6} wrap style={{ flexShrink: 0 }}>
              {(task.startDate || task.dueDate) && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {task.startDate && <span><CalendarOutlined style={{ marginRight: 4 }} />{dayjs(task.startDate).format('DD/MM/YYYY')}</span>}
                  {task.startDate && task.dueDate && <span style={{ margin: '0 6px' }}>→</span>}
                  {task.dueDate && (
                    <span style={{ color: task.overdue ? '#f5222d' : undefined }}>
                      {dayjs(task.dueDate).format('DD/MM/YYYY')}
                    </span>
                  )}
                </Text>
              )}
              <Tooltip title={watching ? 'Bỏ theo dõi' : 'Theo dõi task'}>
                <Button
                  size="small"
                  icon={watching ? <BellFilled style={{ color: '#1890ff' }} /> : <BellOutlined />}
                  onClick={handleToggleWatch}
                  loading={watchLoading}
                >
                  {watching ? 'Đang theo dõi' : 'Theo dõi'}
                </Button>
              </Tooltip>
              {editMode ? (
                <>
                  <Button size="small" icon={<SaveOutlined />} type="primary" loading={saving}
                    onClick={() => form.submit()}>Lưu</Button>
                  <Button size="small" icon={<CloseOutlined />}
                    onClick={() => setEditMode(false)}>Hủy</Button>
                </>
              ) : (
                <>
                  <Button size="small" icon={<EditOutlined />} onClick={handleEnterEdit}>Sửa</Button>
                  <Popconfirm
                    title="Xóa task này?" description="Hành động này không thể hoàn tác."
                    onConfirm={handleDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          </div>

          {/* ── 2-column layout ── */}
          <div style={{
            display: 'flex', gap: 0,
            alignItems: 'flex-start',
            flexDirection: isWide ? 'row' : 'column',
            border: '1px solid var(--card-border, #e8eaf0)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
          }}>

            {/* ─── Left: main content ─── */}
            <div style={{ flex: 1, minWidth: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ── Creator info block ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Avatar size={32} icon={<UserOutlined />} style={{ flexShrink: 0, background: '#4361ee' }} />
                <div>
                  <Text strong style={{ fontSize: 13 }}>{task.reporterName || 'Người tạo'}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Tạo lúc {dayjs(task.createdAt).format('DD/MM/YYYY HH:mm')}
                      {' · '}
                      {dayjs(task.createdAt).fromNow()}
                    </Text>
                  </div>
                </div>
              </div>

              {/* ── Description section ── */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mô tả
                  </Text>
                  {!editMode && (
                    <Button type="text" size="small" icon={<EditOutlined />}
                      onClick={handleEnterEdit}
                      style={{ color: '#8c8c8c', fontSize: 12 }}>
                      Chỉnh sửa
                    </Button>
                  )}
                </div>

                {editMode ? (
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
                        { label: <Tag color="green">Thấp</Tag>, value: TaskPriority.LOW },
                        { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
                        { label: <Tag color="orange">Cao</Tag>, value: TaskPriority.HIGH },
                        { label: <Tag color="red">Khẩn cấp</Tag>, value: TaskPriority.URGENT },
                      ]} />
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
                  <div style={{
                    background: 'var(--desc-bg, #fafbfc)',
                    border: '1px solid var(--desc-border, #f0f0f0)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    minHeight: 80,
                  }}>
                    {task.description ? (
                      <Paragraph style={{ color: '#555', whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                        {task.description}
                      </Paragraph>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>
                        Không có mô tả — nhấn Chỉnh sửa để thêm
                      </Text>
                    )}
                  </div>
                )}
              </div>

              {/* Parent task & subtasks */}
              {!editMode && (task.parentTaskId || (task.subTasks && task.subTasks.length > 0)) && (
                <div style={{ marginTop: 12 }}>
                  {task.parentTaskId && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Task cha</Text>
                      <div style={{
                        marginTop: 6, padding: '8px 12px',
                        background: '#f5f5f5', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.parentTaskKey}</Tag>
                        {task.parentTaskKey ? (
                          <Link to={`/tasks/${task.parentTaskKey}`} style={{ fontSize: 13 }}>
                            {task.parentTaskTitle}
                          </Link>
                        ) : (
                          <Text style={{ fontSize: 13 }}>{task.parentTaskTitle}</Text>
                        )}
                      </div>
                    </div>
                  )}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Subtasks ({task.subTasks.length})</Text>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {task.subTasks.map((sub) => (
                          <div key={sub.id} style={{
                            padding: '8px 12px', background: '#fafafa',
                            borderRadius: 6, border: '1px solid #f0f0f0',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{sub.taskKey}</Tag>
                            <Link to={`/tasks/${sub.taskKey}`} style={{ flex: 1, fontSize: 13 }}>
                              {sub.title}
                            </Link>
                            {sub.assigneeName && (
                              <Text type="secondary" style={{ fontSize: 12 }}>{sub.assigneeName}</Text>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Divider style={{ margin: '16px 0 0 0' }} />

              {/* ═══════════════════════════════════
                  CHECKLIST – collapsible section
              ═══════════════════════════════════ */}
              <div style={{ margin: '0 0' }}>
                {/* Section header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!checklistOpen && task?.id) fetchChecklist(task.id);
                    setChecklistOpen(!checklistOpen);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setChecklistOpen(!checklistOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 0', cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <RightOutlined
                    style={{
                      fontSize: 11, color: '#8c8c8c',
                      transform: checklistOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                  <CheckSquareOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  <Text strong style={{ fontSize: 13 }}>Checklist</Text>
                  {checklist && checklist.totalItems > 0 && (
                    <Badge
                      count={`${checklist.checkedItems}/${checklist.totalItems}`}
                      style={{ backgroundColor: '#52c41a', fontSize: 11 }}
                    />
                  )}
                </div>

                {/* Checklist body */}
                {checklistOpen && (
                  <div style={{ paddingLeft: 22, paddingBottom: 12 }}>
                    {checklistLoading ? (
                      <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
                    ) : (
                      <>
                        {checklist && checklist.totalItems > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {checklist.checkedItems}/{checklist.totalItems} hoàn thành
                              </Text>
                              <Text strong style={{ color: '#52c41a', fontSize: 12 }}>
                                {checklist.completionPercentage}%
                              </Text>
                            </div>
                            <Progress percent={checklist.completionPercentage} showInfo={false}
                              strokeColor="#52c41a" size="small" />
                          </div>
                        )}
                        <div style={{ marginBottom: 12 }}>
                          {checklist?.items.map((item) => (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 0', borderBottom: '1px solid #f0f0f0',
                            }}>
                              <Checkbox checked={item.isChecked} onChange={() => handleToggleCheckItem(item)} />
                              <Text style={{
                                flex: 1, fontSize: 13,
                                textDecoration: item.isChecked ? 'line-through' : 'none',
                                color: item.isChecked ? '#8c8c8c' : undefined,
                              }}>
                                {item.content}
                              </Text>
                              {item.checkedByName && item.isChecked && (
                                <Text type="secondary" style={{ fontSize: 11 }}>{item.checkedByName}</Text>
                              )}
                              <Popconfirm title="Xóa item này?" onConfirm={() => handleDeleteCheckItem(item.id)}
                                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </div>
                          ))}
                        </div>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                            placeholder="Thêm mục việc cần làm..." onPressEnter={handleAddCheckItem} />
                          <Button type="primary" icon={<PlusOutlined />} loading={addingCheckItem}
                            disabled={!newCheckItem.trim()} onClick={handleAddCheckItem}>Thêm</Button>
                        </Space.Compact>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Divider style={{ margin: '0 0' }} />

              {/* ═══════════════════════════════════
                  GIỜ LÀM – collapsible section
              ═══════════════════════════════════ */}
              <div style={{ margin: '0 0' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!timeOpen && task?.id) fetchTimeEntries(task.id);
                    setTimeOpen(!timeOpen);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setTimeOpen(!timeOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 0', cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <RightOutlined
                    style={{
                      fontSize: 11, color: '#8c8c8c',
                      transform: timeOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                  <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <Text strong style={{ fontSize: 13 }}>Giờ làm</Text>
                  {(task.actualHours ?? 0) > 0 && (
                    <Badge
                      count={`${task.actualHours ?? timeTotal}h`}
                      style={{ backgroundColor: '#1890ff', fontSize: 11 }}
                    />
                  )}
                </div>

                {timeOpen && (
                  <div style={{ paddingLeft: 22, paddingBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Tổng: {task.actualHours ?? timeTotal} giờ</Text>
                        {task.estimatedHours && (
                          <Text type="secondary" style={{ fontSize: 12 }}>/ {task.estimatedHours}h ước tính</Text>
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
                        size="small" style={{ marginBottom: 12 }}
                      />
                    )}
                    {timeLoading ? (
                      <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
                    ) : timeEntries.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#bfbfbf', fontSize: 13 }}>
                        <ClockCircleOutlined style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
                        Chưa có nhật ký giờ làm nào
                      </div>
                    ) : (
                      <List
                        dataSource={timeEntries}
                        renderItem={(entry) => (
                          <List.Item
                            style={{ padding: '8px 0' }}
                            actions={user?.id === entry.userId ? [
                              <Tooltip title="Sửa" key="edit">
                                <Button type="text" size="small" icon={<EditOutlined />}
                                  onClick={() => handleOpenEditTime(entry)} />
                              </Tooltip>,
                              <Popconfirm key="del" title="Xóa mục này?"
                                onConfirm={() => handleDeleteTimeEntry(entry.id)}
                                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>,
                            ] : []}
                          >
                            <List.Item.Meta
                              avatar={<Avatar size={28} icon={<UserOutlined />} />}
                              title={
                                <Space>
                                  <Text strong style={{ fontSize: 13 }}>{entry.hours ?? 0} giờ</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>· {entry.userFullName || entry.username}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>· {dayjs(entry.workDate).format('DD/MM/YYYY')}</Text>
                                </Space>
                              }
                              description={entry.description || <Text type="secondary" style={{ fontSize: 12 }}>Không có mô tả</Text>}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>

              <Divider style={{ margin: '0 0 16px 0' }} />

              {/* ═══════════════════════════════════
                  BÌNH LUẬN – comments section
              ═══════════════════════════════════ */}
              <div>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Space size={6}>
                    <CommentOutlined style={{ color: '#4361ee', fontSize: 14 }} />
                    <Text strong style={{ fontSize: 13 }}>Bình luận</Text>
                    {task.commentCount > 0 && (
                      <Badge count={task.commentCount} size="small" color="#4361ee" />
                    )}
                  </Space>
                  <Button size="small" type="text" icon={<ReloadOutlined />}
                    onClick={() => task?.id && fetchComments(task.id)} loading={commentsLoading} />
                </div>

                {/* Comment list */}
                {commentsLoading && comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                ) : rootComments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#bfbfbf', fontSize: 13, marginBottom: 16 }}>
                    <MessageOutlined style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                    Chưa có bình luận nào
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    {rootComments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} currentUserId={user?.id}
                        onReply={handleReply} onEdit={handleEditComment} onDelete={handleDeleteComment} />
                    ))}
                  </div>
                )}

                {/* ════════════════════════════════
                    COMMENT COMPOSER (Redmine style)
                ════════════════════════════════ */}
                <div>
                  {replyTo && (
                    <div style={{
                      background: '#f5f5f5', borderRadius: 6, padding: '4px 10px',
                      marginBottom: 8, fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Text type="secondary">
                        Trả lời <strong>{replyTo.userFullName || replyTo.username}</strong>
                      </Text>
                      <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setReplyTo(null)} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Attachment trigger on the left */}
                    <Upload {...uploadProps} showUploadList={false}>
                      <Tooltip title="Đính kèm tệp">
                        <Button
                          type="text"
                          icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                          loading={uploading}
                          style={{ color: '#8c9ab0', marginTop: 6, padding: '4px 6px' }}
                        />
                      </Tooltip>
                    </Upload>

                    {/* Textarea + toolbar container */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Mention dropdown */}
                      <div style={{ position: 'relative' }}>
                        {mention.showDropdown && mention.suggestions.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: 0,
                            background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.12)',
                            padding: 4, zIndex: 1000,
                            minWidth: 200, maxHeight: 180, overflowY: 'auto', marginBottom: 4,
                          }}>
                            {mention.suggestions.map((u) => (
                              <div key={u.userId}
                                onMouseDown={(e) => { e.preventDefault(); mention.selectMention(u); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '5px 8px', cursor: 'pointer', borderRadius: 6,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Avatar size={22} src={u.avatarUrl} icon={<UserOutlined />} style={{ flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 12 }}>{u.fullName}</div>
                                  <div style={{ color: '#6b7280', fontSize: 11 }}>@{u.username}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment box */}
                        <div style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: '#fffef5',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                          onFocusCapture={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#4361ee';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(67,97,238,0.1)';
                          }}
                          onBlurCapture={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                          }}
                        >
                          {commentPreview ? (
                            <div style={{ padding: '10px 14px', minHeight: 80, fontSize: 13, whiteSpace: 'pre-wrap', color: '#555' }}>
                              {mention.content || <Text type="secondary" style={{ fontStyle: 'italic' }}>Không có nội dung</Text>}
                            </div>
                          ) : (
                            <TextArea
                              ref={mention.textareaRef as any}
                              value={mention.content}
                              onChange={mention.handleChange}
                              placeholder={replyTo
                                ? `Trả lời ${replyTo.userFullName || replyTo.username}... (@mention)`
                                : 'Viết bình luận... (dùng @ để mention)'}
                              autoSize={{ minRows: 3, maxRows: 8 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') mention.setShowDropdown(false);
                                else if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSendComment(); }
                              }}
                              variant="borderless"
                              style={{
                                resize: 'none',
                                padding: '10px 14px 6px',
                                fontSize: 13,
                                background: 'transparent',
                              }}
                            />
                          )}

                          {/* Formatting toolbar */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px 6px',
                            borderTop: '1px solid #f0f0f0',
                            background: 'rgba(0,0,0,0.02)',
                          }}>
                            <Space size={2}>
                              {toolbarButtons.map((btn, idx) => (
                                <Tooltip title={btn.title} key={idx}>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={btn.icon}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      insertFormat(btn.before, btn.after);
                                    }}
                                    style={{ color: '#8c9ab0', padding: '2px 5px', fontSize: 13 }}
                                  />
                                </Tooltip>
                              ))}
                            </Space>
                            <Tooltip title="Gửi (Ctrl+Enter)">
                              <Button
                                type="primary"
                                size="small"
                                icon={<SendOutlined />}
                                loading={commentSending}
                                disabled={!mention.content.trim()}
                                onClick={handleSendComment}
                              >
                                Gửi
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {/* Notify + action row */}
                      <div style={{ marginTop: 8 }}>
                        <Input
                          prefix={<Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Thông báo tới:</Text>}
                          placeholder="Nhập tên hoặc email..."
                          size="small"
                          value={notifyTo}
                          onChange={(e) => setNotifyTo(e.target.value)}
                          style={{ fontSize: 12, marginBottom: 8 }}
                        />
                        <Space size={6}>
                          <Button size="small" onClick={() => setReplyTo(null)}>Hủy</Button>
                          <Button
                            size="small"
                            type={commentPreview ? 'default' : 'dashed'}
                            onClick={() => setCommentPreview(!commentPreview)}
                          >
                            {commentPreview ? 'Chỉnh sửa' : 'Xem trước'}
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            icon={<SendOutlined />}
                            loading={commentSending}
                            disabled={!mention.content.trim()}
                            onClick={handleSendComment}
                          >
                            Gửi bình luận
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spacing before cards */}
              <div style={{ height: 16 }} />

              {/* ── Tệp đính kèm ── */}
              <Card
                size="small"
                title={
                  <Space size={6}>
                    <PaperClipOutlined />
                    Tệp đính kèm
                    {task.attachmentCount > 0 && <Badge count={task.attachmentCount} size="small" color="#52c41a" />}
                  </Space>
                }
                extra={
                  <Space size={6}>
                    <Button size="small" icon={<ReloadOutlined />}
                      onClick={() => task?.id && fetchAttachments(task.id)} loading={attachmentsLoading} />
                    <Upload {...uploadProps} showUploadList={false}>
                      <Button size="small" type="primary" icon={<PaperClipOutlined />} loading={uploading}>
                        Tải lên
                      </Button>
                    </Upload>
                  </Space>
                }
                style={{ borderRadius: 12 }}
              >
                {attachmentsLoading && attachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : attachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#bfbfbf', fontSize: 13 }}>
                    <PaperClipOutlined style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
                    Chưa có tệp đính kèm nào
                  </div>
                ) : (
                  <List
                    dataSource={attachments}
                    renderItem={(att: Attachment) => (
                      <List.Item
                        style={{ padding: '8px 0' }}
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
                              <AuthImage attachmentId={att.id} fileName={att.fileName}
                                style={{ width: 36, height: 36, borderRadius: 4, cursor: 'pointer' }}
                                onClick={() => {
                                  const token = localStorage.getItem('accessToken');
                                  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
                                  window.open(`${base}/attachments/${att.id}/inline?token=${token}`, '_blank');
                                }} />
                            ) : (
                              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            <Space size={6} style={{ fontSize: 11 }}>
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
              </Card>

              {/* ── Liên kết ── */}
              <Card
                size="small"
                title={
                  <Space size={6}>
                    <LinkOutlined />
                    Liên kết
                    {dependencies.length > 0 && <Badge count={dependencies.length} size="small" color="#722ed1" />}
                  </Space>
                }
                extra={
                  <Button type="primary" size="small" icon={<PlusOutlined />}
                    onClick={() => { depForm.resetFields(); setAddDepModal(true); }}>
                    Thêm
                  </Button>
                }
                style={{ borderRadius: 12 }}
              >
                {depsLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
                ) : dependencies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#bfbfbf', fontSize: 13 }}>
                    <LinkOutlined style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                    Chưa có liên kết
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dependencies.map((dep) => (
                      <div key={dep.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 10px', background: '#fafafa',
                        borderRadius: 6, border: '1px solid #f0f0f0',
                      }}>
                        <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                          {DEP_TYPE_LABEL[dep.type] || dep.type}
                        </Tag>
                        <Tag style={{ fontFamily: 'monospace', margin: 0, fontSize: 11 }}>
                          {dep.dependsOnTaskKey}
                        </Tag>
                        {dep.dependsOnTaskKey ? (
                          <Link to={`/tasks/${dep.dependsOnTaskKey}`} style={{ flex: 1, fontSize: 12 }}>
                            {dep.dependsOnTaskTitle}
                          </Link>
                        ) : (
                          <Text style={{ flex: 1, fontSize: 12 }}>{dep.dependsOnTaskTitle}</Text>
                        )}
                        <Popconfirm title="Xóa liên kết này?"
                          onConfirm={() => handleDeleteDependency(dep.id)}
                          okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

            </div>{/* end left col */}

            {/* ─── Right: metadata sidebar ─── */}
            <div style={{
              width: isWide ? 260 : '100%',
              flexShrink: 0,
              borderLeft: isWide ? '1px solid var(--card-border, #e8eaf0)' : undefined,
              borderTop: !isWide ? '1px solid var(--card-border, #e8eaf0)' : undefined,
              background: 'var(--sidebar-bg, #fafbfc)',
            }}>
              <div style={{ overflow: 'hidden' }}>

                {/* Trạng thái */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trạng thái</Text>
                  <StatusSelect
                    value={task.status}
                    size="small"
                    onChange={async (status) => {
                      try {
                        const updated = await updateTaskStatus(task.id, { status: status as TaskStatus });
                        setTask(updated);
                        message.success('Đã cập nhật trạng thái');
                      } catch (e: any) { message.error(e.message || 'Cập nhật thất bại'); }
                    }}
                  />
                </div>

                {/* Ưu tiên */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ưu tiên</Text>
                  <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0 }}>
                    {PRIORITY_LABEL[task.priority]}
                  </Tag>
                </div>

                {/* Người thực hiện */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Người thực hiện</Text>
                  <Select
                    style={{ width: '100%' }}
                    size="small"
                    value={task.assigneeId ?? null}
                    onChange={handleChangeAssignee}
                    loading={membersLoading}
                    placeholder="Chưa gán"
                    allowClear
                    showSearch
                    options={memberOptions}
                    optionLabelProp="label"
                    labelRender={(opt) => {
                      if (!opt.value) return <Text type="secondary">Chưa gán</Text>;
                      const m = members.find((mb) => mb.userId === opt.value);
                      if (!m) return <span>{String(opt.label)}</span>;
                      return (
                        <Space size={6}>
                          <Avatar size={16} src={m.avatarUrl} icon={<UserOutlined />} />
                          <span style={{ fontSize: 13 }}>{m.fullName || m.username}</span>
                        </Space>
                      );
                    }}
                    filterOption={(input, option) =>
                      JSON.stringify(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </div>

                {/* Dự án */}
                {task.projectName && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dự án</Text>
                    <Space size={4}>
                      <FolderOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
                      <Link to={`/projects/${task.projectId}`} style={{ fontSize: 13 }}>{task.projectName}</Link>
                    </Space>
                  </div>
                )}
                <div style={{ display: "flex", gap: 16 }}>
                  {/* Ngày bắt đầu */}
                  {task.startDate && (
                    <div style={{ padding: '10px 14px' }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngày bắt đầu</Text>
                      <Space size={4}>
                        <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
                        <Text style={{ fontSize: 13 }}>{dayjs(task.startDate).format('DD/MM/YYYY')}</Text>
                      </Space>
                    </div>
                  )}

                  {/* Hạn chót */}
                  <div style={{ padding: '10px 14px', borderRight: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hạn chót</Text>
                    {task.dueDate ? (
                      <Space size={4}>
                        <CalendarOutlined style={{ color: task.overdue ? '#f5222d' : '#8c8c8c', fontSize: 13 }} />
                        <Text style={{ fontSize: 13, color: task.overdue ? '#f5222d' : undefined }}>
                          {dayjs(task.dueDate).format('DD/MM/YYYY')}
                          {task.overdue && <Tag color="error" style={{ marginLeft: 4, fontSize: 11, padding: '0 4px' }}>Quá hạn</Tag>}
                        </Text>
                      </Space>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13 }}>Chưa đặt hạn</Text>
                    )}
                  </div>

                </div>
                {/* Giờ */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giờ ước tính / thực tế</Text>
                  <Space size={4}>
                    <Text style={{ fontSize: 13 }}>{task.estimatedHours ?? '—'}h</Text>
                    <Text type="secondary">/</Text>
                    <Text style={{ fontSize: 13, color: '#1890ff' }}>{task.actualHours ?? 0}h</Text>
                  </Space>
                  {task.estimatedHours && (
                    <Progress
                      percent={Math.min(Math.round(((task.actualHours ?? 0) / task.estimatedHours) * 100), 100)}
                      size="small"
                      style={{ marginTop: 6, marginBottom: 0 }}
                      strokeColor={(task.actualHours ?? 0) > task.estimatedHours ? '#f5222d' : '#1890ff'}
                    />
                  )}
                </div>

                {/* Nhãn */}
                {task.labels && task.labels.length > 0 && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nhãn</Text>
                    <Space size={4} wrap>
                      {task.labels.map((label) => (
                        <Tag key={label.id} color={label.color} style={{ margin: 0, fontSize: 11 }}>{label.name}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Cột Kanban */}
                {task.columnName && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cột Kanban</Text>
                    <Tag><AppstoreOutlined /> {task.columnName}</Tag>
                  </div>
                )}

                {/* Người tạo */}
                {task.reporterName && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Người tạo</Text>
                    <Space size={6}>
                      <Avatar size={18} icon={<UserOutlined />} />
                      <Text style={{ fontSize: 13 }}>{task.reporterName}</Text>
                    </Space>
                  </div>
                )}

                {/* Ngày tạo */}
                <div style={{ padding: '10px 14px' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngày tạo</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(task.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                </div>

              </div>
            </div>{/* end right sidebar */}

          </div>{/* end 2-col */}
        </>
      )}

      {/* Modal ghi nhận giờ */}
      <Modal title={<Space><ClockCircleOutlined />Ghi nhận giờ làm việc</Space>}
        open={addTimeModal} onCancel={() => setAddTimeModal(false)} footer={null} destroyOnHidden>
        <Form form={timeForm} layout="vertical" onFinish={handleAddTime} style={{ marginTop: 8 }}>
          <Form.Item name="hours" label="Số giờ" rules={[{ required: true, message: 'Vui lòng nhập số giờ' }]}>
            <InputNumber min={0.1} max={24} step={0.5} style={{ width: '100%' }} placeholder="VD: 2.5" />
          </Form.Item>
          <Form.Item name="workDate" label="Ngày làm việc"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]} initialValue={dayjs()}>
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
      <Modal title={<Space><EditOutlined />Sửa nhật ký giờ làm</Space>}
        open={!!editTimeEntry} onCancel={() => { setEditTimeEntry(null); editTimeForm.resetFields(); }}
        footer={null} destroyOnHidden>
        <Form form={editTimeForm} layout="vertical" onFinish={handleSaveEditTime} style={{ marginTop: 8 }}>
          <Form.Item name="hours" label="Số giờ" rules={[{ required: true, message: 'Vui lòng nhập số giờ' }]}>
            <InputNumber min={0.1} max={24} step={0.5} style={{ width: '100%' }} placeholder="VD: 2.5" />
          </Form.Item>
          <Form.Item name="workDate" label="Ngày làm việc" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
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
      <Modal title={<Space><LinkOutlined />Thêm liên kết task</Space>}
        open={addDepModal} onCancel={() => setAddDepModal(false)} footer={null} destroyOnHidden>
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
    </div>
  );
};

export default TaskDetailPage;
