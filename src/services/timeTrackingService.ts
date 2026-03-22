import api from './api';
import type {
  TimeEntry,
  TimeTotal,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  SpringPage,
} from '../types';

export const timeTrackingService = {
  logTime: async (data: CreateTimeEntryRequest): Promise<TimeEntry> => {
    const response: any = await api.post('/time-entries', data);
    return response.data ?? response;
  },

  getByTask: async (taskId: string): Promise<TimeEntry[]> => {
    const response: any = await api.get(`/tasks/${taskId}/time-entries`);
    return response.data ?? response;
  },

  getTotalByTask: async (taskId: string): Promise<TimeTotal> => {
    const response: any = await api.get(`/tasks/${taskId}/time-entries/total`);
    return response.data ?? response;
  },

  getMyEntries: async (params?: { page?: number; size?: number }): Promise<SpringPage<TimeEntry>> => {
    const response: any = await api.get('/time-entries/my', { params });
    return response.data ?? response;
  },

  getByRange: async (startDate: string, endDate: string): Promise<TimeEntry[]> => {
    const response: any = await api.get('/time-entries/range', { params: { startDate, endDate } });
    return response.data ?? response;
  },

  update: async (id: string, data: UpdateTimeEntryRequest): Promise<TimeEntry> => {
    const response: any = await api.put(`/time-entries/${id}`, data);
    return response.data ?? response;
  },

  delete: (id: string): Promise<void> =>
    api.delete(`/time-entries/${id}`),
};
