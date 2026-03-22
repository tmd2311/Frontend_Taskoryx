import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest, UpdateProfileRequest } from '../types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { adminService } from '../services/adminService';
import { STORAGE_KEYS } from '../utils/config';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isAdmin: boolean | null; // null = chưa kiểm tra
  pendingTwoFactor: boolean; // đang chờ TOTP sau login
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest & { totpCode?: string }) => Promise<{ twoFactorRequired?: boolean }>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  checkAdminAccess: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearMustChangePassword: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mustChangePassword: false,
      isAdmin: null,
      pendingTwoFactor: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // response: { accessToken, refreshToken, userId, username, email, twoFactorEnabled, ... }
          const res = await authService.login(credentials);

          // Nếu server yêu cầu 2FA và chưa cung cấp totpCode
          if (res.twoFactorEnabled && !credentials.totpCode) {
            set({ isLoading: false, pendingTwoFactor: true });
            return { twoFactorRequired: true };
          }

          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);

          // Dựng User từ token response
          const user: User = {
            id: res.userId,
            username: res.username,
            email: res.email,
            fullName: res.fullName,
            avatarUrl: res.avatarUrl,
            twoFactorEnabled: res.twoFactorEnabled,
          };
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));

          set({
            user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            isAuthenticated: true,
            mustChangePassword: res.mustChangePassword === true,
            pendingTwoFactor: false,
            isLoading: false,
            error: null,
          });
          return {};
        } catch (error: any) {
          set({ error: error.message || 'Đăng nhập thất bại', isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.register(data);

          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);

          const user: User = {
            id: res.userId,
            username: res.username,
            email: res.email,
            fullName: res.fullName,
            avatarUrl: res.avatarUrl,
          };
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));

          set({
            user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({ error: error.message || 'Đăng ký thất bại', isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // im lặng
        } finally {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_INFO);
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, mustChangePassword: false, isAdmin: null, pendingTwoFactor: false });
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const user = await userService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Không thể tải thông tin người dùng', isLoading: false });
          throw error;
        }
      },

      updateProfile: async (data: UpdateProfileRequest) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await userService.updateProfile(data);
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(updated));
          set({ user: updated, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Không thể cập nhật hồ sơ', isLoading: false });
          throw error;
        }
      },

      checkAdminAccess: async () => {
        try {
          await adminService.getUsers({ page: 0, size: 1 });
          set({ isAdmin: true });
        } catch {
          set({ isAdmin: false });
        }
      },

      setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
      clearMustChangePassword: () => set({ mustChangePassword: false }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
