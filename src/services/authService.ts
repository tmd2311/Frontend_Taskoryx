import api from './api';
import type {
  LoginRequest, AuthTokenResponse, RegisterRequest, User,
  TwoFactorSetupResponse, TwoFactorStatusResponse, TwoFactorVerifyRequest,
} from '../types';

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

  // ─── 2FA ────────────────────────────────────────────────────
  /** POST /auth/2fa/setup → { qrCodeUrl, secret } */
  twoFactorSetup: async (): Promise<TwoFactorSetupResponse> => {
    const response: any = await api.post('/auth/2fa/setup');
    return response.data ?? response;
  },

  /** POST /auth/2fa/enable { code } */
  twoFactorEnable: async (data: TwoFactorVerifyRequest): Promise<void> => {
    await api.post('/auth/2fa/enable', data);
  },

  /** POST /auth/2fa/disable { code } */
  twoFactorDisable: async (data: TwoFactorVerifyRequest): Promise<void> => {
    await api.post('/auth/2fa/disable', data);
  },

  /** GET /auth/2fa/status → { enabled } */
  twoFactorStatus: async (): Promise<TwoFactorStatusResponse> => {
    const response: any = await api.get('/auth/2fa/status');
    return response.data ?? response;
  },
};
