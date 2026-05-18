import api from './api';
import type {
  ProjectTemplate,
  UseTemplateRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  Project,
} from '../types';

export const templateService = {
  getAll: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates');
    return response.data ?? response;
  },

  getPublic: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates/public');
    return response.data ?? response;
  },

  getById: async (id: string): Promise<ProjectTemplate> => {
    const response: any = await api.get(`/templates/${id}`);
    return response.data ?? response;
  },

  useTemplate: async (id: string, data: UseTemplateRequest): Promise<Project> => {
    const response: any = await api.post(`/templates/${id}/use`, data);
    return response.data ?? response;
  },

  /** POST /templates — yêu cầu quyền TEMPLATE_MANAGE */
  create: async (data: CreateTemplateRequest): Promise<ProjectTemplate> => {
    const response: any = await api.post('/templates', data);
    return response.data ?? response;
  },

  /** PUT /templates/{id} — yêu cầu quyền TEMPLATE_MANAGE */
  update: async (id: string, data: UpdateTemplateRequest): Promise<ProjectTemplate> => {
    const response: any = await api.put(`/templates/${id}`, data);
    return response.data ?? response;
  },

  /** DELETE /templates/{id} — yêu cầu quyền TEMPLATE_MANAGE; system template trả 403 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },
};
