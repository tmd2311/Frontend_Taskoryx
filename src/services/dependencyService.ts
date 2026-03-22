import api from './api';
import type { TaskDependency, CreateDependencyRequest } from '../types';

export const dependencyService = {
  getDependencies: async (taskId: string): Promise<TaskDependency[]> => {
    const response: any = await api.get(`/tasks/${taskId}/dependencies`);
    return response.data ?? response;
  },

  addDependency: async (taskId: string, data: CreateDependencyRequest): Promise<TaskDependency> => {
    const response: any = await api.post(`/tasks/${taskId}/dependencies`, data);
    return response.data ?? response;
  },

  deleteDependency: (taskId: string, depId: string): Promise<void> =>
    api.delete(`/tasks/${taskId}/dependencies/${depId}`),
};
