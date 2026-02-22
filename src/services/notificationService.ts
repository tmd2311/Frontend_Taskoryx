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
    // API trả { key_0: number } – chuẩn hoá thành { count }
    const data = response.data ?? response;
    if (typeof data === 'object' && !('count' in data)) {
      const firstVal = Object.values(data)[0];
      return { count: typeof firstVal === 'number' ? firstVal : 0 };
    }
    return data;
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
