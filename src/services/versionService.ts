import api from './api';
import type {
  Version,
  CreateVersionRequest,
  UpdateVersionRequest,
  GanttTask,
} from '../types';

export const versionService = {
  getVersions: async (projectId: string): Promise<Version[]> => {
    const response: any = await api.get(`/projects/${projectId}/versions`);
    return response.data ?? response;
  },

  getById: async (id: string): Promise<Version> => {
    const response: any = await api.get(`/versions/${id}`);
    return response.data ?? response;
  },

  create: async (projectId: string, data: CreateVersionRequest): Promise<Version> => {
    const response: any = await api.post(`/projects/${projectId}/versions`, data);
    return response.data ?? response;
  },

  update: async (id: string, data: UpdateVersionRequest): Promise<Version> => {
    const response: any = await api.put(`/versions/${id}`, data);
    return response.data ?? response;
  },

  delete: (id: string): Promise<void> =>
    api.delete(`/versions/${id}`),

  getRoadmap: async (projectId: string): Promise<Version[]> => {
    const response: any = await api.get(`/projects/${projectId}/roadmap`);
    return response.data ?? response;
  },

  getGantt: async (projectId: string): Promise<GanttTask[]> => {
    const response: any = await api.get(`/projects/${projectId}/gantt`);
    return response.data ?? response;
  },
};
