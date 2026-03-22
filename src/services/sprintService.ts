import api from './api';
import type {
  Sprint,
  CreateSprintRequest,
  UpdateSprintRequest,
  AddTaskToSprintRequest,
} from '../types';

export const sprintService = {
  getSprints: async (projectId: string): Promise<Sprint[]> => {
    const response: any = await api.get(`/projects/${projectId}/sprints`);
    return response.data ?? response;
  },

  getById: async (id: string): Promise<Sprint> => {
    const response: any = await api.get(`/sprints/${id}`);
    return response.data ?? response;
  },

  create: async (projectId: string, data: CreateSprintRequest): Promise<Sprint> => {
    const response: any = await api.post(`/projects/${projectId}/sprints`, data);
    return response.data ?? response;
  },

  update: async (id: string, data: UpdateSprintRequest): Promise<Sprint> => {
    const response: any = await api.put(`/sprints/${id}`, data);
    return response.data ?? response;
  },

  delete: (id: string): Promise<void> =>
    api.delete(`/sprints/${id}`),

  start: async (id: string): Promise<Sprint> => {
    const response: any = await api.post(`/sprints/${id}/start`);
    return response.data ?? response;
  },

  complete: async (id: string): Promise<Sprint> => {
    const response: any = await api.post(`/sprints/${id}/complete`);
    return response.data ?? response;
  },

  addTask: (id: string, data: AddTaskToSprintRequest): Promise<void> =>
    api.post(`/sprints/${id}/tasks`, data),

  removeTask: (id: string, taskId: string): Promise<void> =>
    api.delete(`/sprints/${id}/tasks/${taskId}`),

  /** GET /sprints/{id}/backlog – tasks trong sprint chưa lên board */
  getBacklog: async (id: string): Promise<import('../types').TaskSummary[]> => {
    const response: any = await api.get(`/sprints/${id}/backlog`);
    return response.data ?? response;
  },
};
