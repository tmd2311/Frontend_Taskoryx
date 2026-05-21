# Taskoryx – Frontend

> Phần mềm quản lý công việc theo mô hình Agile/Scrum, xây dựng bằng React + TypeScript.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant%20Design-6.2-0170FE?logo=antdesign&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e)

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt & Chạy thử](#cài-đặt--chạy-thử)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Biến môi trường](#biến-môi-trường)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [API tích hợp](#api-tích-hợp)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)

---

## Tổng quan

**Taskoryx** là ứng dụng web quản lý công việc theo mô hình SPA (Single Page Application), hỗ trợ làm việc nhóm theo quy trình Agile/Scrum với đầy đủ tính năng: quản lý dự án, bảng Kanban kéo-thả, Sprint planning, theo dõi thời gian, và thông báo thời gian thực.

Repository này chứa phần **Frontend**. Phần **Backend** (Spring Boot + PostgreSQL) nằm ở repository riêng.

```
Browser (React – port 5173)
        │  HTTP/REST + WebSocket (STOMP/SockJS)
        ▼
Spring Boot API (port 8080)
        │
        ▼
   PostgreSQL Database
```

---

## Tính năng

### Quản lý dự án

| Tính năng | Mô tả |
|-----------|-------|
| **Dự án** | Tạo/sửa/xóa dự án, phân quyền thành viên 4 cấp: `OWNER` / `MANAGER` / `DEVELOPER` / `VIEWER` |
| **Template** | Tạo dự án từ template có sẵn (chọn template khi tạo mới) |
| **Thành viên** | Mời, đổi role, kick thành viên; tìm kiếm user để mời |
| **Nhãn (Label)** | Tạo nhãn màu sắc, gán cho task để phân loại |
| **Danh mục** | Quản lý issue categories theo từng dự án |

### Task & Board

| Tính năng | Mô tả |
|-----------|-------|
| **Bảng Kanban** | Kéo-thả task giữa các cột với Optimistic Update; kéo-thả sắp xếp cột |
| **Board cá nhân (PERSONAL)** | Mỗi user có board riêng (boardType: `PERSONAL`); cột gắn `mappedStatus`, kéo task vào cột tự cập nhật trạng thái task |
| **Backlog** | Danh sách task chưa vào board; chọn task để thêm vào Sprint |
| **Sprint (Scrum)** | Tạo Sprint, giao task từ Backlog, bắt đầu / hoàn thành Sprint |
| **Task chi tiết** | 6 tabs: Chi tiết · Checklist · Bình luận · Tệp đính kèm · Giờ làm · Liên kết |
| **Task liên kết** | Dependency: `BLOCKS` hoặc `RELATES_TO`; phát hiện vòng tròn tự động |
| **Form tạo task thông minh (taskFields)** | Mỗi dự án cấu hình `projectConfig.taskFields`; form tạo task tự động render đúng các trường bắt buộc (assignee, dueDate, priority, estimatedHours, labels, sprint) |
| **Gantt Chart** | Xem tiến độ task theo timeline ngày tháng |
| **Versions** | Quản lý phiên bản/milestone, theo dõi % hoàn thành |

### Bình luận & @Mention

| Tính năng | Mô tả |
|-----------|-------|
| **Bình luận** | Đăng, sửa, xóa bình luận; reply lồng nhau 1 cấp |
| **@Mention** | Gõ `@` trong ô bình luận → autocomplete thành viên dự án (debounce 250 ms) |
| **Highlight mention** | Tên được mention hiển thị dạng chip xanh trong nội dung comment |
| **Thông báo mention** | Backend tự parse và gửi notification đến người được tag |

### Theo dõi thời gian

| Tính năng | Mô tả |
|-----------|-------|
| **Log giờ làm** | Ghi nhận, sửa, xóa time entry theo task và ngày |
| **Tổng giờ** | Hiển thị tổng giờ thực tế so với ước tính (thanh progress) |
| **Báo cáo thời gian** | Thống kê daily / weekly / monthly / summary; lọc theo dự án và thành viên |

### Thông báo & Realtime

| Tính năng | Mô tả |
|-----------|-------|
| **WebSocket** | STOMP over SockJS, kết nối khi đăng nhập, tự reconnect |
| **Toast realtime** | Hiện thông báo ngay khi có sự kiện mới |
| **Badge** | Đếm số thông báo chưa đọc, polling 60 giây |
| **Điều hướng thông minh** | Click noti task → mở Task Drawer; click noti dự án → vào trang dự án |
| **Đánh dấu đã đọc** | Đọc từng thông báo hoặc "Đọc tất cả" một lần |

### Tài khoản & Quản trị

| Tính năng | Mô tả |
|-----------|-------|
| **Xác thực JWT** | Access token 24h, auto-refresh khi hết hạn, logout phía client |
| **2FA (TOTP)** | Bật/tắt xác thực 2 bước, tương thích Google Authenticator |
| **Hồ sơ cá nhân** | Sửa tên, số điện thoại, avatar, timezone, ngôn ngữ |
| **Đổi mật khẩu** | Nhập mật khẩu hiện tại; buộc đổi sau khi admin reset |
| **Dark / Light Mode** | Chuyển đổi chế độ sáng/tối, lưu cố định theo thiết bị |
| **Dashboard** | Thống kê tổng quan, biểu đồ ưu tiên & hạn chót bằng Recharts |
| **AI Project** | Tạo dự án bằng mô tả tự nhiên, AI tự đề xuất cấu trúc task |

### Quản trị hệ thống (Admin)

> Chỉ hiển thị với user có quyền `ADMIN_ACCESS`.

| Tính năng | Mô tả |
|-----------|-------|
| **Quản lý người dùng** | Tìm kiếm, tạo tài khoản, chỉnh sửa thông tin, xem trạng thái |
| **Kích hoạt / Vô hiệu hóa** | Soft-delete tài khoản (không xóa dữ liệu); kích hoạt lại khi cần |
| **Đặt lại mật khẩu** | Admin reset → BE sinh mật khẩu ngẫu nhiên, gửi email; user bị buộc đổi khi đăng nhập |
| **Mật khẩu tạm thời** | Hiển thị một lần trong modal sau khi tạo tài khoản (có nút copy) |
| **Gán / thu hồi Role** | Gán hoặc xóa role cho từng user |
| **Quản lý Roles** | Tạo/sửa/xóa custom role; system role (`isSystemRole=true`) không thể xóa |
| **Phân quyền** | Gán/thu hồi permissions cho role; nhóm theo resource; dùng `displayName` từ API |
| **Quản lý Templates** | CRUD template dự án; admin tạo/sửa/xóa template công khai cho toàn hệ thống |

---

## Công nghệ sử dụng

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| [React](https://react.dev) | 19.x | UI Framework |
| [TypeScript](https://typescriptlang.org) | ~5.9.3 | Static typing |
| [Vite](https://vitejs.dev) | ^7.2.4 | Build tool & Dev server |
| [Ant Design](https://ant.design) | ^6.2.1 | UI Component Library |
| [Zustand](https://zustand-demo.pmnd.rs) | ^5.0.10 | State management (với persist middleware) |
| [Axios](https://axios-http.com) | ^1.13.3 | HTTP client (interceptor auto-refresh token) |
| [React Router DOM](https://reactrouter.com) | ^7.13.0 | Client-side routing |
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | ^18.0.1 | Kéo-thả Kanban board |
| [@stomp/stompjs](https://stomp-js.github.io) + sockjs-client | ^7.3.0 / ^1.6.1 | WebSocket realtime |
| [react-quill-new](https://github.com/VaguelySerious/react-quill-new) + quill-mention | ^3.8.3 / ^6.1.1 | Rich-text editor + @mention autocomplete |
| [Recharts](https://recharts.org) | ^3.7.0 | Biểu đồ thống kê |
| [Day.js](https://day.js.org) | ^1.11.19 | Xử lý ngày giờ (locale vi) |

---

## Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- Backend Spring Boot đang chạy tại `http://localhost:8080`

---

## Cài đặt & Chạy thử

### 1. Clone repository

```bash
git clone https://github.com/<your-username>/taskoryx-fe.git
cd taskoryx-fe
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo file môi trường

```bash
cp .env.example .env
```

Chỉnh sửa `.env` nếu backend chạy ở địa chỉ khác:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=Taskoryx
```

### 4. Chạy development server

```bash
npm run dev
```

Truy cập: **http://localhost:5173**

### 5. Build production

```bash
npm run build
npm run preview   # xem trước bản build
```

---

## Cấu trúc thư mục

```
src/
├── main.tsx                      # Entry point
├── App.tsx                       # Router + ConfigProvider (theme)
├── index.css                     # Global styles & CSS variables dark mode
│
├── types/
│   └── index.ts                  # Toàn bộ TypeScript interfaces & enums
│
├── utils/
│   ├── avatar.ts                 # Resolve avatar URL
│   ├── config.ts                 # Cấu hình env, STORAGE_KEYS
│   └── permissionLabels.json     # Nhãn tiếng Việt cho permissions (fallback)
│
├── hooks/
│   └── useMentionInput.ts        # Hook @mention autocomplete cho textarea
│
├── layouts/
│   └── MainLayout.tsx            # Sidebar + Header + Content wrapper
│
├── components/
│   ├── ProtectedRoute.tsx        # Auth guard (redirect /login nếu chưa đăng nhập)
│   ├── TaskDetailDrawer.tsx      # Drawer xem chi tiết task (6 tabs + @mention)
│   ├── TaskFilterPanel.tsx       # Bộ lọc task (trạng thái, ưu tiên, assignee...)
│   ├── SprintKanbanView.tsx      # Kanban board trong Sprint
│   ├── StatusSelect.tsx          # Dropdown chọn / hiển thị trạng thái task
│   ├── NotificationDropdown.tsx  # Chuông thông báo (badge + điều hướng khi click)
│   ├── WatchedTasksDropdown.tsx  # Dropdown task đang theo dõi
│   ├── QuillCommentEditor.tsx    # Editor bình luận (Quill + @mention)
│   ├── RichTextEditor.tsx        # Rich-text editor dùng chung
│   └── AuthImage.tsx             # Ảnh xác thực (avatar upload)
│
├── pages/
│   ├── LoginPage.tsx             # Đăng nhập (hỗ trợ 2FA TOTP)
│   ├── RegisterPage.tsx          # Đăng ký tài khoản
│   ├── ChangePasswordPage.tsx    # Buộc đổi mật khẩu (sau reset bởi admin)
│   ├── DashboardPage.tsx         # Tổng quan: thống kê & biểu đồ Recharts
│   ├── ProjectsPage.tsx          # Danh sách dự án (member + admin view)
│   ├── ProjectDetailPage.tsx     # Chi tiết dự án (9 tabs: Tasks · Sprints · Board ·
│   │                             #   Thành viên · Danh mục · Nhãn · Gantt ·
│   │                             #   Hoạt động · Thống kê)
│   ├── BoardsPage.tsx            # Kanban board cá nhân (boardType: PERSONAL)
│   ├── TasksPage.tsx             # Task được giao cho tôi (hỗ trợ ?openTask=)
│   ├── TaskDetailPage.tsx        # Trang chi tiết task (standalone)
│   ├── ProfilePage.tsx           # Hồ sơ cá nhân + bật/tắt 2FA
│   ├── TimeReportPage.tsx        # Báo cáo thời gian (daily/weekly/monthly)
│   ├── AiProjectPage.tsx         # Tạo dự án bằng AI
│   ├── AdminUsersPage.tsx        # Quản trị: danh sách & quản lý user
│   ├── AdminRolesPage.tsx        # Quản trị: roles & permissions
│   ├── AdminTemplatesPage.tsx    # Quản trị: CRUD template dự án
│   └── tabs/
│       └── BoardTab.tsx          # Tab board Kanban trong ProjectDetailPage
│
├── services/                     # Tầng gọi API – 1 file = 1 domain
│   ├── api.ts                    # Axios instance: auto attach token, auto refresh 401
│   ├── authService.ts            # /auth/login, /register, /refresh, /logout, 2FA
│   ├── userService.ts            # /users/me, /users/search
│   ├── projectService.ts         # /projects, /members, /labels, members/search
│   ├── taskService.ts            # /tasks, /tasks/my, move, status
│   ├── boardService.ts           # /boards, /columns, kanban
│   ├── sprintService.ts          # /sprints, start, complete
│   ├── checklistService.ts       # /tasks/{id}/checklist
│   ├── timeTrackingService.ts    # /time-entries + stats (daily/weekly/monthly/summary)
│   ├── dependencyService.ts      # /tasks/{id}/dependencies
│   ├── watcherService.ts         # /tasks/{id}/watchers
│   ├── notificationService.ts    # /notifications, unread-count, mark-read
│   ├── websocketService.ts       # STOMP/SockJS connect/disconnect
│   ├── activityService.ts        # /projects/{id}/activity
│   ├── categoryService.ts        # /projects/{id}/categories
│   ├── versionService.ts         # /projects/{id}/versions, gantt
│   ├── dashboardService.ts       # /dashboard/me
│   ├── templateService.ts        # /templates/public, use template
│   ├── searchService.ts          # /search global
│   ├── aiService.ts              # AI project generation
│   └── adminService.ts           # /admin/users, /admin/roles, /admin/permissions
│
└── stores/                       # Zustand global state
    ├── authStore.ts              # Auth state + checkAdminAccess (persist)
    ├── taskStore.ts              # Tasks + comments + attachments
    ├── projectStore.ts           # Projects + members + labels
    ├── boardStore.ts             # Boards + columns + kanban data
    ├── notificationStore.ts      # Notifications + unread count
    ├── permissionStore.ts        # Permissions của user hiện tại
    ├── searchStore.ts            # Global search results
    ├── adminStore.ts             # Admin: users / roles / permissions
    └── themeStore.ts             # Dark/light preference (persist)
```

---

## Biến môi trường

Tạo file `.env` tại thư mục gốc (tham khảo `.env.example`):

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | URL của Backend API |
| `VITE_APP_NAME` | `Taskoryx` | Tên hiển thị của ứng dụng |

---

## Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────┐
│                     PAGES                        │
│  DashboardPage · BoardsPage · TasksPage          │
│  ProjectDetailPage · TimeReportPage              │
│  AdminUsersPage · AdminRolesPage · AiProjectPage │
│  AdminTemplatesPage                              │
├──────────────────────────────────────────────────┤
│                  COMPONENTS                      │
│  TaskDetailDrawer · NotificationDropdown         │
│  SprintKanbanView · TaskFilterPanel              │
│  QuillCommentEditor · StatusSelect               │
├──────────────────────────────────────────────────┤
│              CUSTOM HOOKS                        │
│  useMentionInput (@ autocomplete)               │
├──────────────────────────────────────────────────┤
│               ZUSTAND STORES                     │
│  authStore · taskStore · boardStore              │
│  projectStore · notificationStore                │
│  permissionStore · adminStore · themeStore       │
│  searchStore                                     │
├──────────────────────────────────────────────────┤
│               SERVICE LAYER                      │
│  taskService · boardService · sprintService      │
│  timeTrackingService · adminService              │
│  websocketService · aiService · ...              │
├──────────────────────────────────────────────────┤
│        AXIOS HTTP CLIENT (api.ts)                │
│  Auto attach Bearer token                        │
│  Auto refresh khi nhận 401                       │
│  Redirect /login nếu refresh thất bại            │
├──────────────────────────────────────────────────┤
│           SPRING BOOT REST API                   │
│           http://localhost:8080/api              │
└──────────────────────────────────────────────────┘
                    ▲
                    │ WebSocket (STOMP/SockJS)
           websocketService.ts
```

**Nguyên tắc thiết kế:**

- **Tách biệt trách nhiệm** – Pages → Store → Service → API, không gọi API thẳng từ component
- **Single source of truth** – Toàn bộ dữ liệu chia sẻ lưu trong Zustand store
- **Optimistic UI** – Kanban drag-drop và checklist cập nhật UI ngay, đồng bộ server sau
- **Auto token refresh** – Axios interceptor bắt 401, gọi `/auth/refresh`, retry request gốc tự động
- **Typed everywhere** – Tất cả request body và response đều có TypeScript interface trong `types/index.ts`

---

## API tích hợp

Ứng dụng tích hợp với Spring Boot REST API. Base URL: `http://localhost:8080/api`.
Mọi request (trừ `/auth/*`) gửi kèm header `Authorization: Bearer <accessToken>`.

### Các nhóm endpoint chính

| Nhóm | Prefix | Mô tả |
|------|--------|-------|
| Auth | `/auth` | Đăng nhập, đăng ký, refresh token, logout, 2FA |
| User | `/users` | Profile, đổi mật khẩu, tìm kiếm user |
| Project | `/projects` | CRUD dự án, thành viên, labels, thống kê giờ |
| Board | `/boards`, `/columns` | Kanban board, quản lý cột, di chuyển cột |
| Task | `/tasks`, `/projects/{id}/tasks` | CRUD task, kéo thả, lọc, tìm kiếm |
| Comment | `/tasks/{id}/comments`, `/comments` | Bình luận, reply, @mention |
| Attachment | `/tasks/{id}/attachments`, `/attachments` | Upload/download/xóa file |
| Checklist | `/tasks/{id}/checklist` | CRUD checklist items |
| Dependency | `/tasks/{id}/dependencies` | Liên kết BLOCKS / RELATES_TO |
| Watcher | `/tasks/{id}/watchers` | Theo dõi / bỏ theo dõi task |
| Time Entry | `/time-entries`, `/tasks/{id}/time-entries` | Log giờ, sửa, xóa, thống kê |
| Sprint | `/projects/{id}/sprints` | CRUD sprint, bắt đầu, hoàn thành |
| Version | `/projects/{id}/versions`, `/gantt` | Milestone, Gantt chart |
| Category | `/projects/{id}/categories` | Danh mục issue |
| Activity | `/projects/{id}/activity` | Nhật ký hoạt động |
| Notification | `/notifications` | Danh sách, đánh dấu đọc, đếm chưa đọc |
| Dashboard | `/dashboard/me` | Thống kê tổng quan cá nhân |
| Template | `/templates/public` | Template dự án công khai |
| Search | `/search` | Tìm kiếm toàn cục |
| Admin | `/admin/users`, `/admin/roles`, `/admin/permissions` | Quản trị users, roles, permissions |

---

## Đóng góp

Xem hướng dẫn đóng góp tại [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Giấy phép

Dự án được phát hành dưới giấy phép **MIT**. Xem chi tiết tại [LICENSE](./LICENSE).
