# Thiết Kế Ban Đầu - Website Quản Lý Công Việc

## Tổng quan dự án

**Tên dự án:** Task Management System - Frontend

**Mục đích:** Website quản lý công việc được xây dựng với React, TypeScript, Ant Design và Zustand. Hệ thống kết nối với backend RESTful API (Java Spring Boot).

**Ngày tạo:** 25/01/2026

---

## Công nghệ sử dụng

### Core Technologies
- **React 18** - UI Library
- **TypeScript** - Type safety, giúp phát hiện lỗi sớm
- **Vite** - Build tool & Dev server (nhanh hơn Create React App)

### UI & Styling
- **Ant Design** - UI Component Library (phù hợp cho ứng dụng quản lý)
- **Ant Design Icons** - Icon library

### State Management
- **Zustand** - State Management (đơn giản, nhẹ, dễ học)
- **Zustand Persist** - Lưu trữ state vào localStorage

### HTTP Client & Routing
- **Axios** - HTTP Client để gọi API
- **React Router DOM** - Routing cho SPA

### Utilities
- **dayjs** - Date/Time manipulation

---

## Cấu trúc thư mục

```
task-management-app/
├── public/                         # Static files
├── src/
│   ├── components/                 # Reusable components
│   │   └── ProtectedRoute.tsx      # Route guard component
│   ├── layouts/                    # Layout components
│   │   └── MainLayout.tsx          # Main app layout với sidebar
│   ├── pages/                      # Page components
│   │   ├── LoginPage.tsx           # Trang đăng nhập
│   │   ├── RegisterPage.tsx        # Trang đăng ký
│   │   ├── DashboardPage.tsx       # Dashboard với statistics
│   │   └── TasksPage.tsx           # Quản lý tasks (CRUD)
│   ├── services/                   # API services
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── authService.ts          # Authentication API calls
│   │   └── taskService.ts          # Task API calls
│   ├── stores/                     # Zustand stores
│   │   ├── authStore.ts            # Authentication state
│   │   └── taskStore.ts            # Task management state
│   ├── types/                      # TypeScript definitions
│   │   └── index.ts                # All interfaces & types
│   ├── utils/                      # Utility functions
│   │   └── config.ts               # App configuration
│   ├── App.tsx                     # Root component với routing
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── .env.example                    # Environment variables template
├── .env.local                      # Local environment config
├── .gitignore                      # Git ignore rules
├── vercel.json                     # Vercel deployment config
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite configuration
└── README.md                       # Project documentation
```

---

## Tính năng đã implement

### 1. Authentication System
- ✅ **Login Page:** Form đăng nhập với validation
- ✅ **Register Page:** Form đăng ký với email validation
- ✅ **JWT Token Management:** Tự động thêm token vào API requests
- ✅ **Auto Refresh Token:** Tự động refresh khi token hết hạn (401)
- ✅ **Persistent Login:** Lưu authentication state vào localStorage
- ✅ **Logout:** Clear session và redirect về login

### 2. Protected Routes
- ✅ Auto redirect về `/login` nếu chưa authenticated
- ✅ Auto redirect về `/dashboard` sau khi login thành công
- ✅ Route protection component (ProtectedRoute.tsx)

### 3. Main Layout
- ✅ **Sidebar Navigation:** Menu điều hướng với icons
- ✅ **Header:** User avatar, tên user, dropdown menu
- ✅ **Collapsible Sidebar:** Thu gọn/mở rộng sidebar
- ✅ **Responsive Design:** Tự động điều chỉnh trên mobile/tablet

### 4. Dashboard Page
- ✅ **Statistics Cards:** Tổng quan tasks (Total, In Progress, Pending, Completed)
- ✅ **Recent Activities:** Khu vực hiển thị hoạt động gần đây
- ✅ **Upcoming Deadlines:** Khu vực hiển thị deadline sắp tới
- ✅ **Icons & Colors:** Visual indicators cho từng loại statistic

### 5. Task Management (CRUD)
- ✅ **Task List:** Table hiển thị danh sách tasks
- ✅ **Create Task:** Modal form tạo task mới
- ✅ **Edit Task:** Modal form chỉnh sửa task
- ✅ **Delete Task:** Xóa với confirmation dialog
- ✅ **Task Fields:**
  - Title (required)
  - Description (optional)
  - Status (TODO, IN_PROGRESS, REVIEW, DONE)
  - Priority (LOW, MEDIUM, HIGH, URGENT)
  - Due Date (optional)
  - Assignee (optional)
- ✅ **Color Coding:** Status & Priority với màu sắc khác nhau
- ✅ **Pagination:** Phân trang cho danh sách tasks

---

## Data Models (TypeScript Types)

### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role?: string;
}
```

### Task
```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number;
  assignee?: User;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### TaskStatus
```typescript
const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE'
} as const;
```

### TaskPriority
```typescript
const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;
```

---

## API Integration

### Authentication Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/auth/login` | Đăng nhập | `{username, password}` | `{token, refreshToken, user}` |
| POST | `/api/auth/register` | Đăng ký | `{username, email, password, fullName?}` | `{token, refreshToken, user}` |
| POST | `/api/auth/logout` | Đăng xuất | - | - |
| GET | `/api/auth/me` | Lấy user hiện tại | - | `User` |
| POST | `/api/auth/refresh` | Refresh token | `{refreshToken}` | `{token}` |

### Task Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/tasks` | Lấy tất cả tasks | - | `Task[]` |
| GET | `/api/tasks/:id` | Lấy task theo ID | - | `Task` |
| POST | `/api/tasks` | Tạo task mới | `CreateTaskRequest` | `Task` |
| PUT | `/api/tasks/:id` | Cập nhật task | `UpdateTaskRequest` | `Task` |
| DELETE | `/api/tasks/:id` | Xóa task | - | - |

### API Response Format
Backend nên trả về response theo format:
```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

---

## State Management với Zustand

### Auth Store
**Quản lý:**
- User information
- Access token & Refresh token
- Authentication status
- Loading states
- Errors

**Actions:**
- `login(credentials)` - Đăng nhập
- `register(data)` - Đăng ký
- `logout()` - Đăng xuất
- `getCurrentUser()` - Lấy thông tin user
- `setToken(token, refreshToken)` - Set tokens
- `clearError()` - Clear error messages

**Persistence:** State được lưu vào localStorage qua `zustand/persist`

### Task Store
**Quản lý:**
- Tasks array
- Current selected task
- Loading states
- Errors

**Actions:**
- `fetchTasks()` - Lấy danh sách tasks
- `fetchTaskById(id)` - Lấy task theo ID
- `createTask(data)` - Tạo task mới
- `updateTask(id, data)` - Cập nhật task
- `deleteTask(id)` - Xóa task
- `setCurrentTask(task)` - Set task hiện tại
- `clearError()` - Clear errors

---

## Axios Configuration

### Request Interceptor
- Tự động thêm `Authorization: Bearer {token}` vào mọi request
- Lấy token từ localStorage

### Response Interceptor
- **Success:** Trả về `response.data` trực tiếp
- **Error 401:**
  - Tự động gọi refresh token API
  - Lưu token mới vào localStorage
  - Retry request ban đầu với token mới
  - Nếu refresh thất bại → redirect về `/login`
- **Other Errors:** Return error message

---

## Environment Variables

### Development (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=Task Management System
```

### Production (Vercel)
```env
VITE_API_BASE_URL=https://your-backend-api.com/api
VITE_APP_NAME=Task Management System
```

---

## Build & Deployment

### Development
```bash
npm run dev
# Chạy tại http://localhost:5173
```

### Production Build
```bash
npm run build
# Output: dist/
```

### Preview Production
```bash
npm run preview
```

### Deploy lên Vercel

**Cách 1: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel
```

**Cách 2: Vercel Dashboard**
1. Push code lên GitHub repository
2. Truy cập https://vercel.com
3. Import repository từ GitHub
4. Cấu hình Environment Variables
5. Deploy

**Vercel Config (`vercel.json`):**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Security Features

### Authentication
- ✅ JWT token-based authentication
- ✅ Refresh token mechanism
- ✅ Auto logout on token expiration
- ✅ Protected routes

### Data Storage
- ✅ Tokens stored in localStorage
- ✅ No sensitive data in plain text
- ✅ Auto clear on logout

### API Security
- ✅ CORS handling
- ✅ Token in Authorization header
- ✅ Error handling & validation

---

## Future Enhancements

### Planned Features
- [ ] User profile page
- [ ] Task filtering & sorting
- [ ] Task search functionality
- [ ] Real-time notifications
- [ ] Task comments & attachments
- [ ] Team collaboration features
- [ ] Task assignment to multiple users
- [ ] Calendar view for tasks
- [ ] Export tasks to CSV/PDF
- [ ] Dark mode theme
- [ ] Multi-language support (i18n)
- [ ] Email notifications
- [ ] Task templates

### Technical Improvements
- [ ] Unit tests (Jest + React Testing Library)
- [ ] E2E tests (Cypress/Playwright)
- [ ] Performance optimization
- [ ] Code splitting
- [ ] PWA support
- [ ] Offline mode
- [ ] WebSocket for real-time updates

---

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Add loading states for async operations
- Use type-safe imports (`import type`)

### Component Structure
```typescript
import React from 'react';
import type { ComponentProps } from '../types';

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State
  const [state, setState] = useState();

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Handlers
  const handleEvent = () => {
    // Event logic
  };

  // Render
  return <div>...</div>;
};

export default Component;
```

### API Service Pattern
```typescript
export const service = {
  method: async (params): Promise<ReturnType> => {
    const response: any = await api.method(url, data);
    return response;
  },
};
```

---

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Dependencies

### Production
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.1.3",
  "antd": "^5.23.3",
  "zustand": "^5.0.3",
  "axios": "^1.7.9",
  "dayjs": "^1.11.13"
}
```

### Development
```json
{
  "typescript": "~5.6.2",
  "vite": "^7.3.1",
  "@vitejs/plugin-react": "^4.3.4",
  "eslint": "^9.17.0"
}
```

---

## Scripts

```json
{
  "dev": "vite",                    // Development server
  "build": "tsc -b && vite build",  // Production build
  "preview": "vite preview",        // Preview production build
  "lint": "eslint ."                // Lint code
}
```

---

## Notes

### localStorage Keys
```typescript
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
};
```

### API Base URL
- Development: `http://localhost:8080/api`
- Production: Cấu hình trong Vercel environment variables

### Default Routes
- `/` → Redirect to `/dashboard`
- `/login` → Public route
- `/register` → Public route
- `/dashboard` → Protected route
- `/tasks` → Protected route
- `/*` → Redirect to `/dashboard`

---

## License

MIT

---

## Liên hệ & Hỗ trợ

Dự án được tạo bởi Claude Code (Anthropic)
Ngày tạo: 25/01/2026
