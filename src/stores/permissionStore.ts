import { create } from 'zustand';
import { userService } from '../services/userService';

interface PermissionState {
  permissions: string[];
  loaded: boolean;
  fetchMyPermissions: (userId: string) => Promise<void>;
  hasPermission: (name: string) => boolean;
  clearPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  loaded: false,

  fetchMyPermissions: async (userId: string) => {
    const perms = await userService.getMyPermissions(userId);
    set({ permissions: perms, loaded: true });
  },

  hasPermission: (name: string) => get().permissions.includes(name),

  clearPermissions: () => set({ permissions: [], loaded: false }),
}));
