# Hướng dẫn đóng góp – Taskoryx Frontend

Cảm ơn bạn đã quan tâm đến việc đóng góp cho Taskoryx! Tài liệu này hướng dẫn quy trình đóng góp để mọi thứ diễn ra suôn sẻ.

---

## Mục lục

- [Báo cáo lỗi (Bug Report)](#báo-cáo-lỗi)
- [Đề xuất tính năng (Feature Request)](#đề-xuất-tính-năng)
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

### Component

- Dùng **functional component** với TypeScript (`React.FC<Props>`)
- Mỗi page là 1 file trong `src/pages/`
- Components dùng chung đặt trong `src/components/`

### Service

- Mỗi domain là 1 file service trong `src/services/`
- Không viết logic HTTP trực tiếp trong component, luôn đi qua service

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
```

Chi tiết xem thêm tại [README.md](./README.md).
