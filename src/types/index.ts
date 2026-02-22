// ============================================================
// ENUMS & CONSTANTS
// ============================================================

/** Dùng cho UI mapping – column trong Kanban đại diện cho status */
export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const ProjectRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_COMMENTED: 'TASK_COMMENTED',
  TASK_MENTIONED: 'TASK_MENTIONED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  TASK_OVERDUE: 'TASK_OVERDUE',
  PROJECT_INVITED: 'PROJECT_INVITED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationRelatedType = {
  TASK: 'TASK',
  PROJECT: 'PROJECT',
  COMMENT: 'COMMENT',
} as const;
export type NotificationRelatedType =
  (typeof NotificationRelatedType)[keyof typeof NotificationRelatedType];

// ============================================================
// SHARED – Pagination (Spring Boot style)
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** Spring Boot Page response: data.content[] */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-based)
}

/** Query params cho các API có phân trang */
export interface PageParams {
  page?: number; // 0-based
  size?: number;
}

// ============================================================
// USER
// ============================================================

/** User response từ API */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============================================================
// AUTH
// ============================================================

export interface LoginRequest {
  email: string; // API dùng email (không phải username)
  password: string;
}

/** Response từ POST /auth/login và POST /auth/refresh */
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

// ============================================================
// PROJECT
// ============================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  key: string;
  icon?: string;
  color?: string;
  isPublic: boolean;
  isArchived: boolean;
  ownerName?: string;
  ownerId: string;
  memberCount?: number;
  taskCount?: number;
  currentUserRole?: ProjectRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface CreateProjectRequest {
  key: string;     // Bắt buộc, ví dụ "PSBS"
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic?: boolean;
  isArchived?: boolean;
}

export interface AddMemberRequest {
  email: string;   // API dùng email để thêm member
  role: ProjectRole;
}

export interface UpdateMemberRoleRequest {
  role: ProjectRole;
}

// ============================================================
// LABEL
// ============================================================

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CreateLabelRequest {
  name: string;
  color: string;
  description?: string;
}

// ============================================================
// TASK
// ============================================================

/** Task summary – dùng trong list, kanban, my-tasks */
export interface TaskSummary {
  id: string;
  taskKey: string;
  title: string;
  priority: TaskPriority;
  position: number;
  columnId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  dueDate?: string;
  overdue: boolean;
  commentCount: number;
  attachmentCount: number;
}

/** Task detail – dùng khi xem chi tiết một task */
export interface Task extends TaskSummary {
  description?: string;
  projectId: string;
  projectName?: string;
  projectKey?: string;
  boardId?: string;
  boardName?: string;
  columnName?: string;
  reporterId?: string;
  reporterName?: string;
  labels?: Label[];
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  boardId?: string;
  columnId?: string;
  assigneeId?: string;
  labelIds?: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  labelIds?: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface MoveTaskRequest {
  targetColumnId: string; // API dùng targetColumnId
  newPosition: number;    // API dùng newPosition
}

export interface TaskFilterParams extends PageParams {
  keyword?: string;
  columnId?: string;
  assigneeId?: string;
  priorities?: string;  // comma-separated: "MEDIUM,HIGH"
  labelIds?: string;    // comma-separated
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  completed?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ============================================================
// BOARD & COLUMN  (Kanban)
// ============================================================

export interface Board {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  position?: number;
  isDefault?: boolean;
  columns?: Column[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  color?: string;
  isCompleted?: boolean;
  taskLimit?: number;
  taskCount?: number;
  createdAt?: string;
}

/** Full Kanban board response từ GET /boards/:id/kanban */
export interface KanbanBoard {
  boardId: string;
  boardName: string;
  projectId: string;
  projectKey: string;
  columns: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
  isCompleted?: boolean;
  taskLimit?: number;
  taskCount?: number;
  tasks: TaskSummary[];
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

export interface CreateColumnRequest {
  name: string;
  color?: string;
  isCompleted?: boolean;
  taskLimit?: number;
}

export interface UpdateColumnRequest {
  name?: string;
  color?: string;
  isCompleted?: boolean;
  taskLimit?: number;
}

export interface MoveColumnRequest {
  newPosition: number; // API dùng newPosition
}

// ============================================================
// COMMENT
// ============================================================

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  username: string;
  userFullName?: string;
  userAvatar?: string;
  content: string;
  parentId?: string;   // null nếu là comment gốc
  isEdited: boolean;
  replies?: Comment[]; // nested replies
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string; // reply to another comment
}

export interface UpdateCommentRequest {
  content: string;
}

// ============================================================
// ATTACHMENT
// ============================================================

export interface Attachment {
  id: string;
  taskId: string;
  uploadedById: string;
  uploadedByName?: string;
  fileName: string;
  fileSize: number;
  formattedFileSize?: string;
  fileType: string;
  fileUrl: string;
  image?: boolean;
  createdAt: string;
}

// ============================================================
// NOTIFICATION
// ============================================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;         // API dùng "message" không phải "content"
  relatedType: NotificationRelatedType;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ============================================================
// SEARCH
// ============================================================

/** GET /search – trả về projects + users (không có tasks) */
export interface SearchResult {
  keyword: string;
  projects: Project[];
  users: User[];
}

export interface SearchParams {
  q: string;
  limit?: number;
}

/** GET /users/search – phân trang Spring Boot */
export interface UserSearchParams extends PageParams {
  keyword: string;
}

// ============================================================
// ADMIN – Users
// ============================================================

/** Admin user response – có thêm roles array */
export interface AdminUser extends Omit<User, 'role'> {
  roles: Role[];
}

export interface AdminUserFilter extends PageParams {
  search?: string;
  isActive?: boolean;
  roleId?: string;
}

export interface CreateAdminUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface AssignRoleRequest {
  roleId: string; // single roleId (không phải array)
}

export interface ResetPasswordRequest {
  newPassword: string;
}

// ============================================================
// ADMIN – Roles & Permissions
// ============================================================

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string; // API không có "action" field
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole?: boolean;
  permissions?: Permission[];
  createdAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[]; // có thể gán permissions ngay khi tạo
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}
