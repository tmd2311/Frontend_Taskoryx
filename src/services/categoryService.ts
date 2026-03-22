import api from './api';
import type {
  IssueCategory,
  CreateIssueCategoryRequest,
  UpdateIssueCategoryRequest,
} from '../types';

export const categoryService = {
  getCategories: async (projectId: string): Promise<IssueCategory[]> => {
    const response: any = await api.get(`/projects/${projectId}/categories`);
    return response.data ?? response;
  },

  create: async (projectId: string, data: CreateIssueCategoryRequest): Promise<IssueCategory> => {
    const response: any = await api.post(`/projects/${projectId}/categories`, data);
    return response.data ?? response;
  },

  update: async (id: string, data: UpdateIssueCategoryRequest): Promise<IssueCategory> => {
    const response: any = await api.put(`/categories/${id}`, data);
    return response.data ?? response;
  },

  delete: (id: string): Promise<void> =>
    api.delete(`/categories/${id}`),
};
