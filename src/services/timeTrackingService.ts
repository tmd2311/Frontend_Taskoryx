import api from './api';
import type {
  TimeEntry,
  TimeTotal,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  SpringPage,
  DailyTimeStats,
  WeeklyTimeStats,
  MonthlyTimeStats,
  TimeStatsSummary,
  ProjectTimeStats,
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

  /** GET /time-entries/stats/daily?start=...&end=... */
  getDailyStats: async (start: string, end: string): Promise<DailyTimeStats[]> => {
    const response: any = await api.get('/time-entries/stats/daily', { params: { start, end } });
    return response.data ?? response;
  },

  /** GET /time-entries/stats/weekly?start=...&end=... */
  getWeeklyStats: async (start: string, end: string): Promise<WeeklyTimeStats[]> => {
    const response: any = await api.get('/time-entries/stats/weekly', { params: { start, end } });
    return response.data ?? response;
  },

  /** GET /time-entries/stats/monthly?year=... */
  getMonthlyStats: async (year: number): Promise<MonthlyTimeStats[]> => {
    const response: any = await api.get('/time-entries/stats/monthly', { params: { year } });
    return response.data ?? response;
  },

  /** GET /time-entries/stats/summary?start=...&end=... */
  getSummary: async (start: string, end: string): Promise<TimeStatsSummary> => {
    const response: any = await api.get('/time-entries/stats/summary', { params: { start, end } });
    return response.data ?? response;
  },

  /** GET /projects/{projectId}/time-entries/stats?start=...&end=... */
  getProjectStats: async (projectId: string, start: string, end: string): Promise<ProjectTimeStats> => {
    const response: any = await api.get(`/projects/${projectId}/time-entries/stats`, {
      params: { start, end },
    });
    return response.data ?? response;
  },
};
