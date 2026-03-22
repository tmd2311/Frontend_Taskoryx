import api from './api';
import type { Notification, UnreadCountResponse, SpringPage, PageParams } from '../types';

export const notificationService = {
  /**
   * GET /notifications?page=0&size=20
   * Response: SpringPage { content: Notification[] }
   */
  getNotifications: async (params?: PageParams): Promise<SpringPage<Notification>> => {
    const response: any = await api.get('/notifications', { params });
    return response.data ?? response;
  },

  /**
   * GET /notifications/unread-count
   * Response: { count: number }
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response: any = await api.get('/notifications/unread-count');
    return response.data ?? response;
  },

  /** PATCH /notifications/:id/read */
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  /** PATCH /notifications/read-all */
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};
