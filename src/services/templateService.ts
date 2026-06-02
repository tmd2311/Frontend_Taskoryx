import api from './api';
import type {
  ProjectTemplate,
  UseTemplateRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  Project,
} from '../types';

// Backend trả field `public` thay vì `isPublic` — normalize để dùng nhất quán
function normalizeTemplate(t: any): ProjectTemplate {
  return {
    ...t,
    isPublic: t.isPublic ?? t.public ?? false,
  };
}

export const templateService = {
  getAll: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates');
    const data: any[] = response.data ?? response;
    return data.map(normalizeTemplate);
  },

  getPublic: async (): Promise<ProjectTemplate[]> => {
    const response: any = await api.get('/templates/public');
    const data: any[] = response.data ?? response;
    return data.map(normalizeTemplate);
  },

  getById: async (id: string): Promise<ProjectTemplate> => {
    const response: any = await api.get(`/templates/${id}`);
    return normalizeTemplate(response.data ?? response);
  },

  useTemplate: async (id: string, data: UseTemplateRequest): Promise<Project> => {
    const response: any = await api.post(`/templates/${id}/use`, data);
    return response.data ?? response;
  },

  /** POST /templates — yêu cầu quyền TEMPLATE_MANAGE */
  create: async (data: CreateTemplateRequest): Promise<ProjectTemplate> => {
    const response: any = await api.post('/templates', data);
    return normalizeTemplate(response.data ?? response);
  },

  /** PUT /templates/{id} — yêu cầu quyền TEMPLATE_MANAGE */
  update: async (id: string, data: UpdateTemplateRequest): Promise<ProjectTemplate> => {
    const response: any = await api.put(`/templates/${id}`, data);
    return normalizeTemplate(response.data ?? response);
  },

  /** DELETE /templates/{id} — yêu cầu quyền TEMPLATE_MANAGE; system template trả 403 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },
};
