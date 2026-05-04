import api from './api';
import type { User, UpdateProfileRequest, ChangePasswordRequest } from '../types';

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
};
