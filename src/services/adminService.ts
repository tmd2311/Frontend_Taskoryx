import api from './api';
import type {
  AdminUser,
  Role,
  Permission,
  Project,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  AdminUserFilter,
  CreateAdminUserRequest,
  AssignRoleRequest,
  ResetPasswordRequest,
  SpringPage,
} from '../types';

export const adminService = {
  // ── Users ──────────────────────────────────────────────────

  /**
   * GET /admin/users?page=0&size=20
   * Response: SpringPage<AdminUser> – content[] với roles embedded
   */
  getUsers: async (params?: AdminUserFilter): Promise<SpringPage<AdminUser>> => {
    const response: any = await api.get('/admin/users', { params });
    return response.data ?? response;
  },

  /** GET /admin/users/:id */
  getUserById: async (id: string): Promise<AdminUser> => {
    const response: any = await api.get(`/admin/users/${id}`);
    return response.data ?? response;
  },

  /**
   * POST /admin/users
   * Body: { email, fullName, password, username, phone? }
   */
  createUser: async (data: CreateAdminUserRequest): Promise<AdminUser> => {
    const response: any = await api.post('/admin/users', data);
    return response.data ?? response;
  },

  /**
   * PATCH /admin/users/:id/status – Toggle kích hoạt/vô hiệu hoá
   * Không cần body
   */
  toggleUserStatus: async (id: string): Promise<AdminUser> => {
    const response: any = await api.patch(`/admin/users/${id}/status`);
    return response.data ?? response;
  },

  /**
   * POST /admin/users/:id/reset-password
   * Body: { newPassword }
   */
  resetPassword: async (id: string, data: ResetPasswordRequest): Promise<void> => {
    await api.post(`/admin/users/${id}/reset-password`, data);
  },

  /**
   * POST /admin/users/:id/roles
   * Body: { roleId } – Gán một role (single, không phải array)
   */
  assignRole: async (userId: string, data: AssignRoleRequest): Promise<AdminUser> => {
    const response: any = await api.post(`/admin/users/${userId}/roles`, data);
    return response.data ?? response;
  },

  /** DELETE /admin/users/:id/roles/:roleId */
  removeRole: async (userId: string, roleId: string): Promise<AdminUser> => {
    const response: any = await api.delete(`/admin/users/${userId}/roles/${roleId}`);
    return response.data ?? response;
  },

  // ── Projects (Admin) ───────────────────────────────────────

  /** GET /admin/projects – Tất cả project trong hệ thống */
  getAllProjects: async (): Promise<Project[]> => {
    const response: any = await api.get('/admin/projects');
    return response.data ?? response;
  },

  // ── Roles ──────────────────────────────────────────────────

  /** GET /admin/roles */
  getRoles: async (): Promise<Role[]> => {
    const response: any = await api.get('/admin/roles');
    return response.data ?? response;
  },

  /** GET /admin/roles/:id */
  getRoleById: async (id: string): Promise<Role> => {
    const response: any = await api.get(`/admin/roles/${id}`);
    return response.data ?? response;
  },

  /**
   * POST /admin/roles
   * Body: { name, description?, permissionIds? } – có thể gán permissions ngay lúc tạo
   */
  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response: any = await api.post('/admin/roles', data);
    return response.data ?? response;
  },

  /** PUT /admin/roles/:id */
  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response: any = await api.put(`/admin/roles/${id}`, data);
    return response.data ?? response;
  },

  /** DELETE /admin/roles/:id – Không thể xóa system role */
  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/admin/roles/${id}`);
  },

  /**
   * POST /admin/roles/:id/permissions
   * Body: { permissionIds: string[] }
   */
  assignPermissions: async (roleId: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response: any = await api.post(`/admin/roles/${roleId}/permissions`, data);
    return response.data ?? response;
  },

  /**
   * DELETE /admin/roles/:id/permissions
   * Body: { permissionIds: string[] }
   */
  removePermissions: async (roleId: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response: any = await api.delete(`/admin/roles/${roleId}/permissions`, { data });
    return response.data ?? response;
  },

  // ── Permissions ────────────────────────────────────────────

  /** GET /admin/permissions – Tất cả permissions trong hệ thống */
  getPermissions: async (): Promise<Permission[]> => {
    const response: any = await api.get('/admin/permissions');
    return response.data ?? response;
  },
};
