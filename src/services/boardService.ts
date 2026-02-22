import api from './api';
import type {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
  KanbanBoard,
  Column,
  CreateColumnRequest,
  UpdateColumnRequest,
  MoveColumnRequest,
} from '../types';

export const boardService = {
  // ── Boards ─────────────────────────────────────────────────

  /** GET /projects/:projectId/boards – Danh sách boards kèm columns */
  getProjectBoards: async (projectId: string): Promise<Board[]> => {
    const response: any = await api.get(`/projects/${projectId}/boards`);
    return response.data ?? response;
  },

  /**
   * POST /projects/:projectId/boards
   * Body: { name, description? }
   */
  createBoard: async (projectId: string, data: CreateBoardRequest): Promise<Board> => {
    const response: any = await api.post(`/projects/${projectId}/boards`, data);
    return response.data ?? response;
  },

  /** PUT /boards/:id */
  updateBoard: async (boardId: string, data: UpdateBoardRequest): Promise<Board> => {
    const response: any = await api.put(`/boards/${boardId}`, data);
    return response.data ?? response;
  },

  /** DELETE /boards/:id */
  deleteBoard: async (boardId: string): Promise<void> => {
    await api.delete(`/boards/${boardId}`);
  },

  /**
   * GET /boards/:id/kanban
   * Response: { boardId, boardName, projectId, projectKey, columns: [{ id, name, tasks: [...] }] }
   */
  getKanbanBoard: async (boardId: string): Promise<KanbanBoard> => {
    const response: any = await api.get(`/boards/${boardId}/kanban`);
    return response.data ?? response;
  },

  // ── Columns ────────────────────────────────────────────────

  /**
   * POST /boards/:boardId/columns
   * Body: { name, color?, isCompleted?, taskLimit? }
   */
  createColumn: async (boardId: string, data: CreateColumnRequest): Promise<Column> => {
    const response: any = await api.post(`/boards/${boardId}/columns`, data);
    return response.data ?? response;
  },

  /**
   * PUT /columns/:id
   * Body: { name?, color?, isCompleted?, taskLimit? }
   */
  updateColumn: async (columnId: string, data: UpdateColumnRequest): Promise<Column> => {
    const response: any = await api.put(`/columns/${columnId}`, data);
    return response.data ?? response;
  },

  /** DELETE /columns/:id */
  deleteColumn: async (columnId: string): Promise<void> => {
    await api.delete(`/columns/${columnId}`);
  },

  /**
   * PATCH /columns/:id/move
   * Body: { newPosition } – API dùng newPosition (không phải position)
   */
  moveColumn: async (columnId: string, data: MoveColumnRequest): Promise<void> => {
    await api.patch(`/columns/${columnId}/move`, data);
  },
};
