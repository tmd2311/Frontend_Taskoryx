// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export const TaskStatus = {
  TODO:        'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW:   'IN_REVIEW',
  RESOLVED:    'RESOLVED',
  DONE:        'DONE',
  CANCELLED:   'CANCELLED',
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
  MANAGER: 'MANAGER',
  DEVELOPER: 'DEVELOPER',
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
  twoFactorEnabled?: boolean;
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
  twoFactorEnabled?: boolean;
  mustChangePassword?: boolean;
}

// ============================================================
// 2FA
// ============================================================

export interface TwoFactorSetupResponse {
  qrCodeUrl: string;
  secret: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface TwoFactorLoginRequest {
  email: string;
  password: string;
  totpCode: string;
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

/** Subtask tóm tắt – dùng trong task detail */
export interface SubTaskSummary {
  id: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  position?: number;
  overdue?: boolean;
  commentCount?: number;
  attachmentCount?: number;
  dueDate?: string;
  parentTaskId?: string;
  depth?: number;
}

/** Task summary – dùng trong list, kanban, my-tasks */
export interface TaskSummary {
  id: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  position?: number;
  columnId?: string;
  boardId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  dueDate?: string;
  completedAt?: string;
  overdue?: boolean;
  commentCount?: number;
  attachmentCount?: number;
  parentTaskId?: string;
  depth?: number;
  subTasks?: SubTaskSummary[];
  sprintId?: string;
  sprintName?: string;
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
  parentTaskKey?: string;
  parentTaskTitle?: string;
  watcherCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  boardId?: string;
  columnId?: string;
  assigneeId?: string;
  labelIds?: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  parentTaskId?: string;
  versionId?: string;
  categoryId?: string;
  sprintId?: string;
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
  parentTaskId?: string;
  clearParent?: boolean;
  sprintId?: string;
  clearSprint?: boolean;
}

export interface MoveTaskRequest {
  targetColumnId: string | null; // null = đưa về Backlog
  newPosition: number;
}

export interface UpdateStatusRequest {
  status: TaskStatus;
}

export interface TaskFilterParams extends PageParams {
  keyword?: string;
  sprintId?: string;
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
  boardType?: 'KANBAN' | 'SCRUM';
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

export interface MentionedUser {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

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
  mentionedUsernames?: string[];
  mentionedUsers?: MentionedUser[];
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
  commentId?: string;
  uploadedById: string;
  uploadedByName?: string;
  fileName: string;
  fileSize: number;
  formattedFileSize?: string;
  fileType: string;
  fileCategory?: string;
  fileUrl: string;
  /** @deprecated dùng isImage */
  image?: boolean;
  isImage?: boolean;
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
  unreadCount: number;
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
  mustChangePassword?: boolean;
}

export interface AdminUserFilter extends PageParams {
  search?: string;
  isActive?: boolean;
  roleId?: string;
}

export interface CreateAdminUserRequest {
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
}

export interface UpdateAdminUserRequest {
  fullName?: string;
  phone?: string;
  timezone?: string;
  language?: string;
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

// ============================================================
// CHECKLIST
// ============================================================

export interface ChecklistItem {
  id: string;
  taskId: string;
  content: string;
  isChecked: boolean;
  checkedById?: string;
  checkedByName?: string;
  checkedAt?: string;
  position: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChecklistSummary {
  totalItems: number;
  checkedItems: number;
  completionPercentage: number;
  items: ChecklistItem[];
}

export interface CreateChecklistItemRequest {
  content: string;
  position?: number;
}

export interface CreateChecklistBulkRequest {
  items: { content: string }[];
}

export interface UpdateChecklistItemRequest {
  content?: string;
  isChecked?: boolean;
}

// ============================================================
// TIME TRACKING
// ============================================================

export interface TimeEntry {
  id: string;
  taskId: string;
  taskKey?: string;
  userId: string;
  username?: string;
  userFullName?: string;
  hours: number;
  formattedHours?: string;
  description?: string;
  workDate: string;
  createdAt?: string;
}

export interface CreateTimeEntryRequest {
  taskId: string;
  hours: number;
  description?: string;
  workDate: string;
}

export interface UpdateTimeEntryRequest {
  hours?: number;
  description?: string;
  workDate?: string;
}

export interface TimeTotal {
  totalHours: number;
}

export interface DailyTimeStats {
  date: string;
  dayOfWeek: string;
  totalHours: number;
  formattedHours: string;
  entryCount: number;
  entries: TimeEntry[];
}

export interface WeeklyTimeStats {
  year: number;
  weekOfYear: number;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  totalHours: number;
  formattedHours: string;
  entryCount: number;
  days: DailyTimeStats[];
}

export interface MonthlyTimeStats {
  year: number;
  month: number;
  monthName: string;
  totalHours: number;
  formattedHours: string;
  entryCount: number;
  activeDays: number;
  days?: DailyTimeStats[];
}

export interface TimeStatsByProject {
  projectId: string;
  projectName: string;
  projectKey: string;
  totalHours: number;
  formattedHours: string;
  entryCount: number;
}

export interface TimeStatsSummary {
  totalHours: number;
  formattedTotalHours: string;
  totalEntries: number;
  activeDays: number;
  avgHoursPerActiveDay: number;
  avgHoursPerDay: number;
  byProject: TimeStatsByProject[];
  byDay: DailyTimeStats[];
}

export interface TimeStatsByMember {
  userId: string;
  userName: string;
  totalHours: number;
  formattedHours: string;
  entryCount: number;
}

export interface TimeStatsByTask {
  taskKey: string;
  taskTitle: string;
  estimatedHours?: number;
  loggedHours: number;
  formattedLoggedHours: string;
  progressPercent?: number;
}

export interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalHours: number;
  formattedTotalHours: string;
  totalEntries: number;
  byMember: TimeStatsByMember[];
  byTask: TimeStatsByTask[];
  byDay: DailyTimeStats[];
}

// ============================================================
// SPRINT
// ============================================================

export const SprintStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type SprintStatus = (typeof SprintStatus)[keyof typeof SprintStatus];

export interface Sprint {
  id: string;
  projectId: string;
  boardId?: string;
  boardName?: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  taskCount?: number;
  completedTaskCount?: number;
  inProgressTaskCount?: number;
  tasks?: TaskSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  boardId?: string;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface AddTaskToSprintRequest {
  taskId: string;
}

// ============================================================
// VERSION (Milestone)
// ============================================================

export const VersionStatus = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  CLOSED: 'CLOSED',
} as const;
export type VersionStatus = (typeof VersionStatus)[keyof typeof VersionStatus];

export interface Version {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: VersionStatus;
  dueDate?: string;
  releaseDate?: string;
  totalTasks?: number;
  completedTasks?: number;
  completionPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVersionRequest {
  name: string;
  description?: string;
  status?: VersionStatus;
  dueDate?: string;
  releaseDate?: string;
}

export interface UpdateVersionRequest {
  name?: string;
  description?: string;
  status?: VersionStatus;
  dueDate?: string;
  releaseDate?: string;
}

// ============================================================
// ISSUE CATEGORY
// ============================================================

export interface IssueCategory {
  id: string;
  projectId: string;
  name: string;
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueCategoryRequest {
  name: string;
  defaultAssigneeId?: string;
}

export interface UpdateIssueCategoryRequest {
  name?: string;
  defaultAssigneeId?: string;
}

// ============================================================
// TASK DEPENDENCY
// ============================================================

export const DependencyType = {
  BLOCKS: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
} as const;
export type DependencyType = (typeof DependencyType)[keyof typeof DependencyType];

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTaskKey?: string;
  dependsOnTaskTitle?: string;
  type: DependencyType;
  createdAt: string;
}

export interface CreateDependencyRequest {
  dependsOnTaskId: string;
  type: DependencyType;
}

// ============================================================
// TASK WATCHER
// ============================================================

export interface TaskWatcher {
  id: string;
  taskId: string;
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface WatcherStatus {
  watching: boolean;
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export interface ActivityLog {
  id: string;
  projectId?: string;
  taskId?: string;
  userId: string;
  username?: string;
  userFullName?: string;
  userAvatar?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  createdAt: string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardStats {
  totalTasks: number;
  myTasks: number;
  overdueTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  upcomingDueTasks?: TaskSummary[];
  recentActivity?: ActivityLog[];
}

// ============================================================
// GANTT
// ============================================================

export interface GanttTask {
  id: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
}

// ============================================================
// TEMPLATE
// ============================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  isPublic: boolean;
  createdAt?: string;
}

export interface UseTemplateRequest {
  name: string;
  key: string;
  description?: string;
  color?: string;
  isPublic?: boolean;
}
