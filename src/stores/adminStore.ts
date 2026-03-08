import { create } from 'zustand';
import type {
  AdminUser,
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  AdminUserFilter,
  CreateAdminUserRequest,
  AssignRoleRequest,
  ResetPasswordRequest,
  SpringPage,
} from '../types';
import { adminService } from '../services/adminService';

interface AdminState {
  users: AdminUser[];
  currentUser: AdminUser | null;
  roles: Role[];
  currentRole: Role | null;
  permissions: Permission[];
  totalPages: number;
  totalElements: number;
  isLoading: boolean;
  error: string | null;

  fetchUsers: (params?: AdminUserFilter) => Promise<void>;
  fetchUserById: (id: string) => Promise<void>;
  createUser: (data: CreateAdminUserRequest) => Promise<AdminUser>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetPassword: (id: string, data: ResetPasswordRequest) => Promise<void>;
  assignRole: (userId: string, data: AssignRoleRequest) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;

  fetchRoles: () => Promise<void>;
  fetchRoleById: (id: string) => Promise<void>;
  createRole: (data: CreateRoleRequest) => Promise<Role>;
  updateRole: (id: string, data: UpdateRoleRequest) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  assignPermissions: (roleId: string, data: AssignPermissionsRequest) => Promise<void>;
  removePermissions: (roleId: string, data: AssignPermissionsRequest) => Promise<void>;

  fetchPermissions: () => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  currentUser: null,
  roles: [],
  currentRole: null,
  permissions: [],
  totalPages: 0,
  totalElements: 0,
  isLoading: false,
  error: null,

  // ── Users ──────────────────────────────────────────────────

  fetchUsers: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const page = await adminService.getUsers(params);
      set({ users: page.content, totalPages: page.totalPages, totalElements: page.totalElements, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải danh sách người dùng', isLoading: false });
    }
  },

  fetchUserById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = await adminService.getUserById(id);
      set({ currentUser: user, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải thông tin người dùng', isLoading: false });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await adminService.createUser(data);
      set((state) => ({ users: [...state.users, user], isLoading: false }));
      return user;
    } catch (error: any) {
      set({ error: error.message || 'Không thể tạo người dùng', isLoading: false });
      throw error;
    }
  },

  toggleUserStatus: async (id) => {
    const updated = await adminService.toggleUserStatus(id);
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? updated : u)),
      currentUser: state.currentUser?.id === id ? updated : state.currentUser,
    }));
  },

  resetPassword: async (id, data) => {
    await adminService.resetPassword(id, data);
  },

  assignRole: async (userId, data) => {
    const updated = await adminService.assignRole(userId, data);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? updated : u)),
      currentUser: state.currentUser?.id === userId ? updated : state.currentUser,
    }));
  },

  removeRole: async (userId, roleId) => {
    const updated = await adminService.removeRole(userId, roleId);
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? updated : u)),
      currentUser: state.currentUser?.id === userId ? updated : state.currentUser,
    }));
  },

  // ── Roles ──────────────────────────────────────────────────

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const roles = await adminService.getRoles();
      set({ roles, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải danh sách role', isLoading: false });
    }
  },

  fetchRoleById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const role = await adminService.getRoleById(id);
      set({ currentRole: role, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải role', isLoading: false });
    }
  },

  createRole: async (data) => {
    const role = await adminService.createRole(data);
    set((state) => ({ roles: [...state.roles, role] }));
    return role;
  },

  updateRole: async (id, data) => {
    const updated = await adminService.updateRole(id, data);
    set((state) => ({
      roles: state.roles.map((r) => (r.id === id ? updated : r)),
      currentRole: state.currentRole?.id === id ? updated : state.currentRole,
    }));
  },

  deleteRole: async (id) => {
    await adminService.deleteRole(id);
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== id),
      currentRole: state.currentRole?.id === id ? null : state.currentRole,
    }));
  },

  assignPermissions: async (roleId, data) => {
    const updated = await adminService.assignPermissions(roleId, data);
    set((state) => ({
      roles: state.roles.map((r) => (r.id === roleId ? updated : r)),
      currentRole: state.currentRole?.id === roleId ? updated : state.currentRole,
    }));
  },

  removePermissions: async (roleId, data) => {
    const updated = await adminService.removePermissions(roleId, data);
    set((state) => ({
      roles: state.roles.map((r) => (r.id === roleId ? updated : r)),
      currentRole: state.currentRole?.id === roleId ? updated : state.currentRole,
    }));
  },

  // ── Permissions ────────────────────────────────────────────

  fetchPermissions: async () => {
    try {
      const permissions = await adminService.getPermissions();
      set({ permissions });
    } catch {
      // im lặng
    }
  },

  clearError: () => set({ error: null }),
}));
