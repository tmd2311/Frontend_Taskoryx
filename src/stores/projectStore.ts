import { create } from 'zustand';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMember,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  Label,
  CreateLabelRequest,
} from '../types';
import { projectService } from '../services/projectService';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  members: ProjectMember[];
  labels: Label[];
  isLoading: boolean;
  membersLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  fetchMembers: (projectId: string) => Promise<void>;
  addMember: (projectId: string, data: AddMemberRequest) => Promise<void>;
  updateMemberRole: (projectId: string, userId: string, data: UpdateMemberRoleRequest) => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;

  fetchLabels: (projectId: string) => Promise<void>;
  createLabel: (projectId: string, data: CreateLabelRequest) => Promise<Label>;
  deleteLabel: (labelId: string) => Promise<void>;

  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  members: [],
  labels: [],
  isLoading: false,
  membersLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.getProjects();
      set({ projects, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải danh sách project', isLoading: false });
    }
  },

  fetchProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectService.getProjectById(id);
      set({ currentProject: project, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Không thể tải project', isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectService.createProject(data);
      set((state) => ({ projects: [...state.projects, project], isLoading: false }));
      return project;
    } catch (error: any) {
      set({ error: error.message || 'Không thể tạo project', isLoading: false });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await projectService.updateProject(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
        currentProject: state.currentProject?.id === id ? updated : state.currentProject,
        isLoading: false,
      }));
      return updated;
    } catch (error: any) {
      set({ error: error.message || 'Không thể cập nhật project', isLoading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Không thể xóa project', isLoading: false });
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  fetchMembers: async (projectId) => {
    set({ membersLoading: true });
    try {
      const members = await projectService.getMembers(projectId);
      set({ members, membersLoading: false });
    } catch {
      set({ membersLoading: false });
    }
  },

  addMember: async (projectId, data) => {
    const member = await projectService.addMember(projectId, data);
    set((state) => ({ members: [...state.members, member] }));
  },

  updateMemberRole: async (projectId, userId, data) => {
    const updated = await projectService.updateMemberRole(projectId, userId, data);
    set((state) => ({
      members: state.members.map((m) => (m.userId === userId ? updated : m)),
    }));
  },

  removeMember: async (projectId, userId) => {
    await projectService.removeMember(projectId, userId);
    set((state) => ({ members: state.members.filter((m) => m.userId !== userId) }));
  },

  fetchLabels: async (projectId) => {
    try {
      const labels = await projectService.getLabels(projectId);
      set({ labels });
    } catch {
      // im lặng
    }
  },

  createLabel: async (projectId, data) => {
    const label = await projectService.createLabel(projectId, data);
    set((state) => ({ labels: [...state.labels, label] }));
    return label;
  },

  deleteLabel: async (labelId) => {
    await projectService.deleteLabel(labelId);
    set((state) => ({ labels: state.labels.filter((l) => l.id !== labelId) }));
  },

  clearError: () => set({ error: null }),
}));
