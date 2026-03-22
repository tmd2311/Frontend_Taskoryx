import api from './api';
import type { DashboardStats } from '../types';

export const dashboardService = {
  getMyDashboard: async (): Promise<DashboardStats> => {
    const response: any = await api.get('/dashboard/me');
    return response.data ?? response;
  },

  getProjectDashboard: async (projectId: string): Promise<any> => {
    const response: any = await api.get(`/dashboard/projects/${projectId}`);
    return response.data ?? response;
  },
};
