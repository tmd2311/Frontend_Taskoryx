import api from './api';
import type { ProjectTemplate, UseTemplateRequest, Project } from '../types';

export const templateService = {
  getAll: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates');
    return response.data ?? response;
  },

  getPublic: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates/public');
    return response.data ?? response;
  },

  useTemplate: async (id: string, data: UseTemplateRequest): Promise<Project> => {
    const response: any = await api.post(`/templates/${id}/use`, data);
    return response.data ?? response;
  },
};
