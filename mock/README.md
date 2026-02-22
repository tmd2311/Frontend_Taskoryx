# Mock API Server

Mock API server sử dụng json-server để test frontend mà không cần backend thật.

## Thông tin đăng nhập

### Tài khoản Admin
- **Username:** `admin`
- **Password:** `admin123`
- **Email:** admin@example.com

### Tài khoản User
- **Username:** `user`
- **Password:** `user123`
- **Email:** user@example.com

## Cách sử dụng

### Chạy cả Frontend + Mock API
```bash
npm start
```
Lệnh này sẽ chạy đồng thời:
- Mock API server tại: http://localhost:8080
- Frontend dev server tại: http://localhost:5173

### Chỉ chạy Mock API
```bash
npm run api
```

### Chỉ chạy Frontend
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/refresh` - Refresh token

### Tasks
- `GET /api/tasks` - Lấy danh sách tasks
- `GET /api/tasks/:id` - Lấy task theo ID
- `POST /api/tasks` - Tạo task mới
- `PUT /api/tasks/:id` - Cập nhật task
- `DELETE /api/tasks/:id` - Xóa task

## Test với curl/Postman

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Tasks
```bash
curl -X GET http://localhost:8080/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Task
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "New Task",
    "description": "Task description",
    "status": "TODO",
    "priority": "MEDIUM"
  }'
```

## Dữ liệu mẫu

Database mock có sẵn:
- 2 users (admin, user)
- 6 tasks với các status khác nhau

Dữ liệu được lưu trong file `mock/db.json` và sẽ được cập nhật khi bạn thêm/sửa/xóa tasks.

## Lưu ý

- Mock API này chỉ dùng để test, không phải production
- Tokens là fake, không có mã hóa thật
- Password được lưu dạng plain text (không an toàn)
- Dữ liệu sẽ reset khi restart server (trừ khi bạn edit db.json)
