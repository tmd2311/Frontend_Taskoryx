# Task Management System - Frontend

Website quản lý công việc được xây dựng với React, TypeScript, Ant Design và Zustand.

## Công nghệ sử dụng

- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool & Dev server
- **Ant Design** - UI Component Library
- **Zustand** - State Management
- **Axios** - HTTP Client
- **React Router** - Routing

## Tính năng

- ✅ Authentication (Login/Register)
- ✅ JWT Token Management với Auto Refresh
- ✅ Protected Routes
- ✅ Task CRUD Operations
- ✅ Responsive Design
- ✅ RESTful API Integration

## Cấu trúc dự án

```
src/
├── components/       # Reusable components
├── layouts/          # Layout components
├── pages/            # Page components
├── services/         # API services
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Cài đặt

1. Clone repository:
```bash
cd task-management-app
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env.local` từ `.env.example`:
```bash
cp .env.example .env.local
```

4. Cập nhật URL API trong `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Chạy Development Server

```bash
npm run dev
```

App sẽ chạy tại `http://localhost:5173`

## Build Production

```bash
npm run build
```

Build output sẽ nằm trong thư mục `dist/`

## Preview Production Build

```bash
npm run preview
```

## Deploy lên Vercel

### Cách 1: Deploy qua Vercel CLI

1. Cài đặt Vercel CLI:
```bash
npm install -g vercel
```

2. Login vào Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### Cách 2: Deploy qua Vercel Dashboard

1. Push code lên GitHub repository
2. Truy cập [Vercel Dashboard](https://vercel.com)
3. Import repository từ GitHub
4. Cấu hình Environment Variables:
   - `VITE_API_BASE_URL`: URL của backend API
5. Deploy

## Environment Variables

Cần cấu hình các biến môi trường sau trong Vercel:

- `VITE_API_BASE_URL`: URL của backend API (production)
- `VITE_APP_NAME`: Tên ứng dụng

## API Integration

Backend API cần implement các endpoints sau:

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Response Format

API responses nên theo format:

```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

## Authentication Flow

1. User login → nhận JWT token
2. Token được lưu vào localStorage
3. Axios interceptor tự động thêm token vào header
4. Khi token hết hạn (401) → tự động refresh token
5. Nếu refresh thất bại → redirect về login

## Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
