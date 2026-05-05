import api from './api';
import type { TaskWatcher, WatcherStatus, TaskSummary } from '../types';

export const watcherService = {
  watch: (taskId: string): Promise<void> =>
    api.post(`/tasks/${taskId}/watchers`),

  unwatch: (taskId: string): Promise<void> =>
    api.delete(`/tasks/${taskId}/watchers`),

  getWatchers: async (taskId: string): Promise<TaskWatcher[]> => {
    const response: any = await api.get(`/tasks/${taskId}/watchers`);
    return response.data ?? response;
  },

  getStatus: async (taskId: string): Promise<WatcherStatus> => {
    const response: any = await api.get(`/tasks/${taskId}/watchers/status`);
    return response.data ?? response;
  },

  getWatchedTasks: async (): Promise<TaskSummary[]> => {
    const response: any = await api.get('/users/me/watched-tasks');
    return response.data ?? response;
  },
};
