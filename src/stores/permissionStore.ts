import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userService } from '../services/userService';

interface PermissionState {
  permissions: string[];
  loaded: boolean;
  fetchMyPermissions: (userId: string) => Promise<void>;
  hasPermission: (name: string) => boolean;
  clearPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      permissions: [],
      loaded: false,

      fetchMyPermissions: async (userId: string) => {
        const perms = await userService.getMyPermissions(userId);
        set({ permissions: perms, loaded: true });
      },

      hasPermission: (name: string) => get().permissions.includes(name),

      clearPermissions: () => set({ permissions: [], loaded: false }),
    }),
    {
      name: 'permission-storage',
      partialize: (state) => ({
        permissions: state.permissions,
        loaded: state.loaded,
      }),
    }
  )
);
