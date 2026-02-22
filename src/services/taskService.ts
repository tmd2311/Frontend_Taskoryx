import api from './api';
import type {
  Task,
  TaskSummary,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  TaskFilterParams,
  SpringPage,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  Attachment,
} from '../types';

export const taskService = {
  // ── Task CRUD ──────────────────────────────────────────────

  /** GET /tasks/my – Danh sách task được giao cho tôi (array, không phân trang) */
  getMyTasks: async (): Promise<TaskSummary[]> => {
    const response: any = await api.get('/tasks/my');
    return response.data ?? response;
  },

  /** GET /tasks/:id – Chi tiết task */
  getTaskById: async (id: string): Promise<Task> => {
    const response: any = await api.get(`/tasks/${id}`);
    return response.data ?? response;
  },

  /**
   * GET /projects/:projectId/tasks – Danh sách task trong project
   * Hỗ trợ lọc: keyword, columnId, assigneeId, priorities (comma-sep),
   *             labelIds (comma-sep), dueDateFrom/To, overdue, completed,
   *             page, size, sortBy, sortDir
   */
  getProjectTasks: async (
    projectId: string,
    params?: TaskFilterParams
  ): Promise<SpringPage<TaskSummary>> => {
    const response: any = await api.get(`/projects/${projectId}/tasks`, { params });
    return response.data ?? response;
  },

  /** GET /projects/:projectId/tasks/search?q= – Tìm kiếm task theo tiêu đề/mô tả */
  searchProjectTasks: async (projectId: string, q: string): Promise<TaskSummary[]> => {
    const response: any = await api.get(`/projects/${projectId}/tasks/search`, { params: { q } });
    return response.data ?? response;
  },

  /** POST /projects/:projectId/tasks – Tạo task mới */
  createTask: async (projectId: string, data: CreateTaskRequest): Promise<Task> => {
    const response: any = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data ?? response;
  },

  /** PUT /tasks/:id – Cập nhật task */
  updateTask: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
    const response: any = await api.put(`/tasks/${id}`, data);
    return response.data ?? response;
  },

  /** DELETE /tasks/:id */
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  /**
   * PATCH /tasks/:id/move – Di chuyển task (Kanban drag & drop)
   * Body: { targetColumnId, newPosition }
   */
  moveTask: async (id: string, data: MoveTaskRequest): Promise<Task> => {
    const response: any = await api.patch(`/tasks/${id}/move`, data);
    return response.data ?? response;
  },

  // ── Comments ───────────────────────────────────────────────

  /** GET /tasks/:taskId/comments */
  getComments: async (taskId: string): Promise<Comment[]> => {
    const response: any = await api.get(`/tasks/${taskId}/comments`);
    return response.data ?? response;
  },

  /**
   * POST /tasks/:taskId/comments
   * Body: { content, parentId? } – @mention bằng @username trong content
   */
  addComment: async (taskId: string, data: CreateCommentRequest): Promise<Comment> => {
    const response: any = await api.post(`/tasks/${taskId}/comments`, data);
    return response.data ?? response;
  },

  /** PUT /comments/:id – Chỉnh sửa comment */
  updateComment: async (commentId: string, data: UpdateCommentRequest): Promise<Comment> => {
    const response: any = await api.put(`/comments/${commentId}`, data);
    return response.data ?? response;
  },

  /** DELETE /comments/:id */
  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },

  // ── Attachments ────────────────────────────────────────────

  /** GET /tasks/:taskId/attachments */
  getAttachments: async (taskId: string): Promise<Attachment[]> => {
    const response: any = await api.get(`/tasks/${taskId}/attachments`);
    return response.data ?? response;
  },

  /** POST /tasks/:taskId/attachments – Upload file (max 10MB, multipart/form-data) */
  uploadAttachment: async (taskId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response: any = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data ?? response;
  },

  /** DELETE /attachments/:id */
  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await api.delete(`/attachments/${attachmentId}`);
  },
};
