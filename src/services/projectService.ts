import api from './api';
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

export const projectService = {
  // ── Projects ───────────────────────────────────────────────

  /** GET /projects – Danh sách project của tôi (array, không phân trang) */
  getProjects: async (): Promise<Project[]> => {
    const response: any = await api.get('/projects');
    return response.data ?? response;
  },

  /** GET /projects/:id */
  getProjectById: async (id: string): Promise<Project> => {
    const response: any = await api.get(`/projects/${id}`);
    return response.data ?? response;
  },

  /**
   * POST /projects
   * Body: { key, name, description?, color?, icon?, isPublic? }
   * key là mã project viết hoa, ví dụ "PSBS"
   */
  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response: any = await api.post('/projects', data);
    return response.data ?? response;
  },

  /** PUT /projects/:id */
  updateProject: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const response: any = await api.put(`/projects/${id}`, data);
    return response.data ?? response;
  },

  /** DELETE /projects/:id */
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  // ── Members – Quản lý thành viên & phân quyền ─────────────

  /** GET /projects/:id/members */
  getMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response: any = await api.get(`/projects/${projectId}/members`);
    return response.data ?? response;
  },

  /**
   * POST /projects/:id/members
   * Body: { email, role } – API dùng email để tìm user (không phải userId)
   */
  addMember: async (projectId: string, data: AddMemberRequest): Promise<ProjectMember> => {
    const response: any = await api.post(`/projects/${projectId}/members`, data);
    return response.data ?? response;
  },

  /** PUT /projects/:id/members/:userId/role */
  updateMemberRole: async (
    projectId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<ProjectMember> => {
    const response: any = await api.put(`/projects/${projectId}/members/${userId}/role`, data);
    return response.data ?? response;
  },

  /** DELETE /projects/:id/members/:userId */
  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },

  // ── Labels ─────────────────────────────────────────────────

  /** GET /projects/:projectId/labels */
  getLabels: async (projectId: string): Promise<Label[]> => {
    const response: any = await api.get(`/projects/${projectId}/labels`);
    return response.data ?? response;
  },

  /**
   * POST /projects/:projectId/labels
   * Body: { name, color, description? }
   */
  createLabel: async (projectId: string, data: CreateLabelRequest): Promise<Label> => {
    const response: any = await api.post(`/projects/${projectId}/labels`, data);
    return response.data ?? response;
  },

  /** DELETE /labels/:id */
  deleteLabel: async (labelId: string): Promise<void> => {
    await api.delete(`/labels/${labelId}`);
  },
};
