import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;

  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  totalPages: 0,
  currentPage: 0,
  isLoading: false,

  fetchNotifications: async (page = 0) => {
    set({ isLoading: true });
    try {
      const result = await notificationService.getNotifications({ page, size: 20 });
      set((state) => ({
        notifications: page === 0 ? result.content : [...state.notifications, ...result.content],
        totalPages: result.totalPages,
        currentPage: page,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // im lặng – badge không ảnh hưởng UX chính
    }
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
