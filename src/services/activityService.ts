import api from './api';
import type { ActivityLog, SpringPage } from '../types';

export const activityService = {
  getProjectActivity: async (
    projectId: string,
    params?: { page?: number; size?: number }
  ): Promise<SpringPage<ActivityLog>> => {
    const response: any = await api.get(`/projects/${projectId}/activity`, { params });
    return response.data ?? response;
  },

  getTaskActivity: async (taskId: string): Promise<ActivityLog[]> => {
    const response: any = await api.get(`/tasks/${taskId}/activity`);
    return response.data ?? response;
  },
};
