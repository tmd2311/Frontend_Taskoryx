# Hướng dẫn đóng góp – Taskoryx Frontend

Cảm ơn bạn đã quan tâm đến việc đóng góp cho Taskoryx! Tài liệu này hướng dẫn quy trình đóng góp để mọi thứ diễn ra suôn sẻ.

---

## Mục lục

- [Báo cáo lỗi](#báo-cáo-lỗi)
- [Đề xuất tính năng](#đề-xuất-tính-năng)
- [Quy trình đóng góp code](#quy-trình-đóng-góp-code)
- [Quy ước code](#quy-ước-code)
- [Cài đặt môi trường phát triển](#cài-đặt-môi-trường-phát-triển)

---

## Báo cáo lỗi

Nếu bạn phát hiện lỗi, vui lòng tạo [GitHub Issue](../../issues/new) với các thông tin:

- **Mô tả lỗi**: Lỗi xảy ra như thế nào?
- **Các bước tái hiện**: Làm gì để thấy lỗi?
- **Kết quả mong đợi**: Đáng lẽ phải ra gì?
- **Kết quả thực tế**: Thực tế ra gì?
- **Môi trường**: OS, trình duyệt, phiên bản Node.js

---

## Đề xuất tính năng

Tạo [GitHub Issue](../../issues/new) với nhãn `enhancement` và mô tả:

- Tính năng bạn muốn thêm là gì?
- Tại sao tính năng này hữu ích?
- Bạn hình dung giao diện/luồng hoạt động như thế nào?

---

## Quy trình đóng góp code

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/taskoryx-fe.git
cd taskoryx-fe
```

### 2. Tạo branch mới

Đặt tên branch theo quy ước:

```bash
git checkout -b feat/ten-tinh-nang    # tính năng mới
git checkout -b fix/mo-ta-loi         # sửa lỗi
git checkout -b docs/cap-nhat-readme  # tài liệu
```

### 3. Phát triển & commit

```bash
# Viết code...

git add <files>
git commit -m "feat: thêm tính năng X"
```

**Quy ước commit message** (Conventional Commits):

| Tiền tố | Ý nghĩa |
|---------|---------|
| `feat:` | Tính năng mới |
| `fix:` | Sửa lỗi |
| `docs:` | Cập nhật tài liệu |
| `style:` | Thay đổi CSS/style |
| `refactor:` | Tái cấu trúc code |
| `chore:` | Cập nhật config, dependencies |

### 4. Kiểm tra trước khi push

```bash
npm run lint      # kiểm tra ESLint
npx tsc --noEmit  # kiểm tra TypeScript
npm run build     # đảm bảo build thành công
```

### 5. Tạo Pull Request

- Push branch lên fork của bạn
- Tạo Pull Request vào branch `main`
- Mô tả rõ những thay đổi bạn đã làm
- Liên kết với Issue liên quan (nếu có): `Closes #123`

---

## Quy ước code

### TypeScript

- Tất cả types/interfaces đặt tại `src/types/index.ts`
- Không dùng `any` nếu có thể tránh được
- Đặt tên interface bắt đầu bằng chữ hoa: `TaskSummary`, `CreateTaskRequest`
- `Project` có thêm field `projectConfig?: ProjectConfig`
- `ProjectConfig` gồm `taskFields?: string[]`, `enabledModules?: string[]`, `boardType?: string`
- `Board` có thêm `boardType?: 'KANBAN' | 'SCRUM' | 'PERSONAL'` và `ownerId?: string | null`
- `Column` / `KanbanColumn` có thêm `mappedStatus?: string | null`
- `CreateColumnRequest` / `UpdateColumnRequest` có thêm `mappedStatus?: string`
- `CreateBoardRequest` hỗ trợ `boardType?: 'KANBAN' | 'SCRUM' | 'PERSONAL'`

### Component

- Dùng **functional component** với TypeScript (`React.FC<Props>`)
- Mỗi page là 1 file trong `src/pages/`
- Components dùng chung đặt trong `src/components/`

### Store & Service

- Mỗi domain là 1 file service trong `src/services/` và 1 store trong `src/stores/`
- Không gọi API thẳng từ component — luôn đi qua service; không gọi service thẳng từ component — luôn đi qua store
- Store chỉ nên gọi đúng service của domain mình

### Quản trị (Admin)

- Chỉ render menu và trang Admin khi `user.permissions` chứa `ADMIN_ACCESS`
- Dùng `displayName` từ `GET /admin/permissions` để hiển thị tên quyền trên UI, không hardcode
- Disable thao tác "Vô hiệu hóa" nếu target user là chính mình (`user.id === currentUser.id`)
- `AdminTemplatesPage` quản lý template công khai, tích hợp với endpoint `/templates`

### Quy ước Board & Task Form

#### Board cá nhân (PERSONAL board)

- `BoardsPage` truyền `boardType: 'PERSONAL'` khi gọi API tạo board.
- Khi thêm cột vào PERSONAL board, bắt buộc truyền `mappedStatus` trong request — thiếu field này sẽ gây lỗi phía backend.
- Khi người dùng kéo task sang cột khác, store tự động cập nhật `task.status` bằng giá trị `mappedStatus` của cột đích (optimistic update) — không cần gọi thêm API cập nhật status riêng.

#### Form tạo task động (taskFields)

- Đọc danh sách field được bật từ `currentProject.projectConfig.taskFields` trong store.
- Dùng helper `isFieldRequired(field: string): boolean` để xác định field nào bắt buộc và đánh dấu required trên form.
- Áp dụng nhất quán ở: `BoardsPage`, `BoardTab`, `ProjectDetailPage` (cả 2 modal tạo/chỉnh sửa task).
- Các field có thể required tuỳ cấu hình dự án: `assignee`, `dueDate`, `priority`, `estimatedHours`, `labels`, `sprint`.

### Style

- Dùng **inline style** cho style đặc thù của component
- Dùng **CSS class** trong `index.css` cho style toàn cục hoặc override Ant Design
- Không dùng thư viện CSS-in-JS riêng

---

## Cài đặt môi trường phát triển

```bash
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

Chi tiết xem thêm tại [README.md](./README.md).
