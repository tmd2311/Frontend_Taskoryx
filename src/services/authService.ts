import api from './api';
import type { LoginRequest, AuthTokenResponse, RegisterRequest, User } from '../types';

export const authService = {
  /** Đăng nhập – body: {email, password} → response: {accessToken, refreshToken, ...} */
  login: async (credentials: LoginRequest): Promise<AuthTokenResponse> => {
    const response: any = await api.post('/auth/login', credentials);
    return response.data ?? response;
  },

  /** Đăng ký */
  register: async (data: RegisterRequest): Promise<AuthTokenResponse> => {
    const response: any = await api.post('/auth/register', data);
    return response.data ?? response;
  },

  /** Đăng xuất */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  /** Lấy thông tin user hiện tại */
  getCurrentUser: async (): Promise<User> => {
    const response: any = await api.get('/users/me');
    return response.data ?? response;
  },

  /** Làm mới access token */
  refreshToken: async (refreshToken: string): Promise<AuthTokenResponse> => {
    const response: any = await api.post('/auth/refresh', { refreshToken });
    return response.data ?? response;
  },
};
