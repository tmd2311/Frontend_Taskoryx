import { create } from 'zustand';
import type {
  Task,
  TaskSummary,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateStatusRequest,
  MoveTaskRequest,
  TaskFilterParams,
  SpringPage,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  Attachment,
} from '../types';
import { taskService } from '../services/taskService';

interface TaskState {
  // Danh sách task
  myTasks: TaskSummary[];
  projectTasks: SpringPage<TaskSummary> | null;
  backlog: TaskSummary[];
  backlogLoading: boolean;
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;

  // Comments
  comments: Comment[];
  commentsLoading: boolean;

  // Attachments
  attachments: Attachment[];
  attachmentsLoading: boolean;

  // Actions – Task
  fetchMyTasks: () => Promise<void>;
  fetchProjectTasks: (projectId: string, params?: TaskFilterParams) => Promise<void>;
  fetchBacklog: (projectId: string) => Promise<void>;
  fetchTaskById: (id: string) => Promise<void>;
  createTask: (projectId: string, data: CreateTaskRequest) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskRequest) => Promise<Task>;
  updateTaskStatus: (id: string, data: UpdateStatusRequest) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, data: MoveTaskRequest) => Promise<Task>;
  setCurrentTask: (task: Task | null) => void;

  // Actions – Comments
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, data: CreateCommentRequest) => Promise<Comment>;
  updateComment: (commentId: string, data: UpdateCommentRequest) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;

  // Actions – Attachments
  fetchAttachments: (taskId: string) => Promise<void>;
  uploadAttachment: (taskId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (attachmentId: string) => Promise<void>;

  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  myTasks: [],
  projectTasks: null,
  backlog: [],
  backlogLoading: false,
  currentTask: null,
  isLoading: false,
  error: null,
  comments: [],
  commentsLoading: false,
  attachments: [],
  attachmentsLoading: false,

  // ── Task Actions ───────────────────────────────────────────

  fetchMyTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await taskService.getMyTasks();
      set({ myTasks: tasks, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải task của tôi', isLoading: false });
    }
  },

  fetchProjectTasks: async (projectId, params) => {
    set({ isLoading: true, error: null });
    try {
      const page = await taskService.getProjectTasks(projectId, params);
      set({ projectTasks: page, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải task của project', isLoading: false });
    }
  },

  fetchBacklog: async (projectId) => {
    set({ backlogLoading: true });
    try {
      const tasks = await taskService.getBacklog(projectId);
      set({ backlog: tasks, backlogLoading: false });
    } catch {
      set({ backlogLoading: false });
    }
  },

  fetchTaskById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const task = await taskService.getTaskById(id);
      set({ currentTask: task, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải task', isLoading: false });
    }
  },

  createTask: async (projectId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newTask = await taskService.createTask(projectId, data);
      set({ isLoading: false });
      return newTask;
    } catch (error: any) {
      set({ error: error.message || 'Không thể tạo task', isLoading: false });
      throw error;
    }
  },

  updateTask: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await taskService.updateTask(id, data);
      set((state) => ({
        currentTask: state.currentTask?.id === id ? updated : state.currentTask,
        projectTasks: state.projectTasks
          ? {
              ...state.projectTasks,
              content: state.projectTasks.content.map((t) =>
                t.id === id ? { ...t, ...updated } : t
              ),
            }
          : null,
        isLoading: false,
      }));
      return updated;
    } catch (error: any) {
      set({ error: error.message || 'Không thể cập nhật task', isLoading: false });
      throw error;
    }
  },

  updateTaskStatus: async (id, data) => {
    // Optimistic update
    const prev = useTaskStore.getState().currentTask;
    set((state) => ({
      currentTask: state.currentTask?.id === id
        ? { ...state.currentTask, status: data.status }
        : state.currentTask,
      myTasks: state.myTasks.map((t) => t.id === id ? { ...t, status: data.status } : t),
      backlog: state.backlog.map((t) => t.id === id ? { ...t, status: data.status } : t),
    }));
    try {
      const updated = await taskService.updateStatus(id, data);
      set((state) => ({
        currentTask: state.currentTask?.id === id ? updated : state.currentTask,
        myTasks: state.myTasks.map((t) => t.id === id ? { ...t, ...updated } : t),
        backlog: state.backlog.map((t) => t.id === id ? { ...t, ...updated } : t),
      }));
      return updated;
    } catch (error: any) {
      // Rollback
      set((state) => ({
        currentTask: state.currentTask?.id === id && prev ? prev : state.currentTask,
      }));
      throw error;
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await taskService.deleteTask(id);
      set((state) => ({
        myTasks: state.myTasks.filter((t) => t.id !== id),
        backlog: state.backlog.filter((t) => t.id !== id),
        projectTasks: state.projectTasks
          ? { ...state.projectTasks, content: state.projectTasks.content.filter((t) => t.id !== id) }
          : null,
        currentTask: state.currentTask?.id === id ? null : state.currentTask,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Không thể xóa task', isLoading: false });
      throw error;
    }
  },

  /**
   * Optimistic update: cập nhật UI ngay, sync server sau
   * Body: { targetColumnId, newPosition }
   */
  moveTask: async (id, data) => {
    try {
      const updated = await taskService.moveTask(id, data);
      set((state) => ({
        currentTask: state.currentTask?.id === id ? updated : state.currentTask,
      }));
      return updated;
    } catch (error: any) {
      set({ error: error.message || 'Không thể di chuyển task' });
      throw error;
    }
  },

  setCurrentTask: (task) => set({ currentTask: task }),

  // ── Comment Actions ────────────────────────────────────────

  fetchComments: async (taskId) => {
    set({ commentsLoading: true });
    try {
      const comments = await taskService.getComments(taskId);
      set({ comments, commentsLoading: false });
    } catch {
      set({ commentsLoading: false });
    }
  },

  addComment: async (taskId, data) => {
    const comment = await taskService.addComment(taskId, data);
    set((state) => ({
      comments: [...state.comments, comment],
      currentTask: state.currentTask
        ? { ...state.currentTask, commentCount: (state.currentTask.commentCount ?? 0) + 1 }
        : null,
    }));
    return comment;
  },

  updateComment: async (commentId, data) => {
    const updated = await taskService.updateComment(commentId, data);
    set((state) => ({
      comments: state.comments.map((c) => (c.id === commentId ? updated : c)),
    }));
    return updated;
  },

  deleteComment: async (commentId) => {
    await taskService.deleteComment(commentId);
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== commentId),
      currentTask: state.currentTask
        ? { ...state.currentTask, commentCount: Math.max(0, (state.currentTask.commentCount ?? 1) - 1) }
        : null,
    }));
  },

  // ── Attachment Actions ─────────────────────────────────────

  fetchAttachments: async (taskId) => {
    set({ attachmentsLoading: true });
    try {
      const attachments = await taskService.getAttachments(taskId);
      set({ attachments, attachmentsLoading: false });
    } catch {
      set({ attachmentsLoading: false });
    }
  },

  uploadAttachment: async (taskId, file) => {
    const attachment = await taskService.uploadAttachment(taskId, file);
    set((state) => ({
      attachments: [...state.attachments, attachment],
      currentTask: state.currentTask
        ? { ...state.currentTask, attachmentCount: (state.currentTask.attachmentCount ?? 0) + 1 }
        : null,
    }));
    return attachment;
  },

  deleteAttachment: async (attachmentId) => {
    await taskService.deleteAttachment(attachmentId);
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attachmentId),
      currentTask: state.currentTask
        ? { ...state.currentTask, attachmentCount: Math.max(0, (state.currentTask.attachmentCount ?? 1) - 1) }
        : null,
    }));
  },

  clearError: () => set({ error: null }),
}));
