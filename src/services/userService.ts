import api from './api';
import type { User, UpdateProfileRequest, ChangePasswordRequest, Role } from '../types';

export const userService = {
  /** GET /users/me */
  getMe: async (): Promise<User> => {
    const response: any = await api.get('/users/me');
    return response.data ?? response;
  },

  /**
   * PUT /users/me
   * Body: { fullName?, phone?, avatarUrl?, timezone?, language? }
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response: any = await api.put('/users/me', data);
    return response.data ?? response;
  },

  /** POST /users/me/avatar – multipart/form-data */
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    const response: any = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data ?? response;
  },

  /**
   * PUT /users/me/password
   * Body: { currentPassword, newPassword, confirmPassword }
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.put('/users/me/password', data);
  },

  /** GET /users/:id */
  getUserById: async (id: string): Promise<User> => {
    const response: any = await api.get(`/users/${id}`);
    return response.data ?? response;
  },

  /**
   * GET /admin/users/:id – lấy roles + permissions của user hiện tại.
   * Trả về mảng permission names. Nếu 403 (không phải admin) → trả về [].
   */
  getMyPermissions: async (userId: string): Promise<string[]> => {
    try {
      const response: any = await api.get(`/admin/users/${userId}`);
      const adminUser = response.data ?? response;
      const roles: Role[] = adminUser.roles ?? [];
      const names = new Set<string>();
      for (const role of roles) {
        for (const perm of role.permissions ?? []) {
          if (perm.name) names.add(perm.name);
        }
      }
      return Array.from(names);
    } catch {
      return [];
    }
  },
};
