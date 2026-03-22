import api from './api';
import type {
  ChecklistSummary,
  ChecklistItem,
  CreateChecklistItemRequest,
  CreateChecklistBulkRequest,
  UpdateChecklistItemRequest,
} from '../types';

export const checklistService = {
  getChecklist: async (taskId: string): Promise<ChecklistSummary> => {
    const response: any = await api.get(`/tasks/${taskId}/checklist`);
    return response.data ?? response;
  },

  addItem: async (taskId: string, data: CreateChecklistItemRequest): Promise<ChecklistItem> => {
    const response: any = await api.post(`/tasks/${taskId}/checklist`, data);
    return response.data ?? response;
  },

  addBulk: async (taskId: string, data: CreateChecklistBulkRequest): Promise<ChecklistItem[]> => {
    const response: any = await api.post(`/tasks/${taskId}/checklist/bulk`, data);
    return response.data ?? response;
  },

  updateItem: async (id: string, data: UpdateChecklistItemRequest): Promise<ChecklistItem> => {
    const response: any = await api.put(`/checklist/${id}`, data);
    return response.data ?? response;
  },

  deleteItem: (id: string): Promise<void> =>
    api.delete(`/checklist/${id}`),

  deleteAll: (taskId: string): Promise<void> =>
    api.delete(`/tasks/${taskId}/checklist`),
};
