import { create } from 'zustand';
import type {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
  KanbanBoard,
  KanbanColumn,
  Column,
  CreateColumnRequest,
  UpdateColumnRequest,
  TaskSummary,
  MoveTaskRequest,
} from '../types';
import { boardService } from '../services/boardService';
import { taskService } from '../services/taskService';

interface BoardState {
  boards: Board[];
  currentBoard: KanbanBoard | null;
  isLoading: boolean;
  isDragging: boolean;
  error: string | null;

  // Board
  fetchBoards: (projectId: string) => Promise<void>;
  createBoard: (projectId: string, data: CreateBoardRequest) => Promise<Board>;
  updateBoard: (boardId: string, data: UpdateBoardRequest) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  fetchKanban: (boardId: string) => Promise<void>;

  // Column
  createColumn: (boardId: string, data: CreateColumnRequest) => Promise<Column>;
  updateColumn: (columnId: string, data: UpdateColumnRequest) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  moveColumn: (columnId: string, newPosition: number) => Promise<void>;

  // Drag & Drop task
  moveTaskOptimistic: (taskId: string, data: MoveTaskRequest) => void;
  syncMoveTask: (taskId: string, data: MoveTaskRequest) => Promise<void>;
  setDragging: (v: boolean) => void;

  clearError: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  isLoading: false,
  isDragging: false,
  error: null,

  // ── Board ──────────────────────────────────────────────────

  fetchBoards: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const boards = await boardService.getProjectBoards(projectId);
      set({ boards, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải boards', isLoading: false });
    }
  },

  createBoard: async (projectId, data) => {
    const board = await boardService.createBoard(projectId, data);
    set((state) => ({ boards: [...state.boards, board] }));
    return board;
  },

  updateBoard: async (boardId, data) => {
    const updated = await boardService.updateBoard(boardId, data);
    set((state) => ({
      boards: state.boards.map((b) => (b.id === boardId ? updated : b)),
    }));
  },

  deleteBoard: async (boardId) => {
    await boardService.deleteBoard(boardId);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== boardId),
      currentBoard: state.currentBoard?.boardId === boardId ? null : state.currentBoard,
    }));
  },

  fetchKanban: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      const kanban = await boardService.getKanbanBoard(boardId);
      set({ currentBoard: kanban, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải Kanban board', isLoading: false });
    }
  },

  // ── Column ─────────────────────────────────────────────────

  createColumn: async (boardId, data) => {
    const column = await boardService.createColumn(boardId, data);
    set((state) => {
      if (!state.currentBoard) return {};
      const newKanbanCol: KanbanColumn = {
        id: column.id,
        name: column.name,
        position: column.position,
        color: column.color,
        isCompleted: column.isCompleted,
        taskLimit: column.taskLimit,
        taskCount: 0,
        tasks: [],
      };
      return {
        currentBoard: {
          ...state.currentBoard,
          columns: [...state.currentBoard.columns, newKanbanCol],
        },
      };
    });
    return column;
  },

  updateColumn: async (columnId, data) => {
    const updated = await boardService.updateColumn(columnId, data);
    set((state) => {
      if (!state.currentBoard) return {};
      return {
        currentBoard: {
          ...state.currentBoard,
          columns: state.currentBoard.columns.map((c) =>
            c.id === columnId ? { ...c, ...updated } : c
          ),
        },
      };
    });
  },

  deleteColumn: async (columnId) => {
    await boardService.deleteColumn(columnId);
    set((state) => {
      if (!state.currentBoard) return {};
      return {
        currentBoard: {
          ...state.currentBoard,
          columns: state.currentBoard.columns.filter((c) => c.id !== columnId),
        },
      };
    });
  },

  moveColumn: async (columnId, newPosition) => {
    // Optimistic reorder
    set((state) => {
      if (!state.currentBoard) return {};
      const cols = [...state.currentBoard.columns];
      const fromIdx = cols.findIndex((c) => c.id === columnId);
      if (fromIdx === -1) return {};
      const [moved] = cols.splice(fromIdx, 1);
      cols.splice(newPosition, 0, moved);
      return {
        currentBoard: {
          ...state.currentBoard,
          columns: cols.map((c, i) => ({ ...c, position: i })),
        },
      };
    });
    try {
      await boardService.moveColumn(columnId, { newPosition });
    } catch (error: any) {
      set({ error: 'Không thể di chuyển cột' });
      const boardId = get().currentBoard?.boardId;
      if (boardId) get().fetchKanban(boardId);
    }
  },

  // ── Drag & Drop Task ───────────────────────────────────────

  /** Cập nhật UI ngay lập tức khi kéo task */
  moveTaskOptimistic: (taskId, { targetColumnId, newPosition }) => {
    set((state) => {
      if (!state.currentBoard) return {};

      let movedTask: TaskSummary | undefined;

      // Xóa task khỏi column cũ
      const cols = state.currentBoard.columns.map((col) => {
        const idx = col.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          movedTask = { ...col.tasks[idx], columnId: targetColumnId, position: newPosition };
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        return col;
      });

      if (!movedTask) return {};

      // Chèn task vào column đích đúng vị trí
      const finalCols = cols.map((col) => {
        if (col.id !== targetColumnId) return col;
        const tasks = [...col.tasks];
        tasks.splice(newPosition, 0, movedTask!);
        return { ...col, tasks };
      });

      return { currentBoard: { ...state.currentBoard, columns: finalCols } };
    });
  },

  /** Đồng bộ với server, rollback nếu lỗi */
  syncMoveTask: async (taskId, data) => {
    try {
      await taskService.moveTask(taskId, data);
    } catch (error: any) {
      set({ error: 'Không thể lưu vị trí task' });
      const boardId = get().currentBoard?.boardId;
      if (boardId) get().fetchKanban(boardId);
    }
  },

  setDragging: (isDragging) => set({ isDragging }),
  clearError: () => set({ error: null }),
}));
