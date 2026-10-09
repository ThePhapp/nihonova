# AGENTS.md

## Mục tiêu dự án

Đây là ứng dụng hỗ trợ học JLPT, gồm:

- `frontend/`: Next.js 13, React, TypeScript, TailwindCSS và Pages Router.
- `backend/`: Node.js, Express, TypeScript và PostgreSQL.
- `infra/`: Docker Compose và script khởi tạo cơ sở dữ liệu.

## Quy tắc chung

- Đọc các file liên quan trước khi sửa; giữ thay đổi nhỏ, rõ ràng và đúng phạm vi yêu cầu.
- Không tự ý thay đổi API, schema cơ sở dữ liệu, tên biến môi trường hoặc cấu trúc thư mục nếu chưa cần thiết.
- Không commit file bí mật như `.env`, token, mật khẩu, private key hoặc dữ liệu người dùng.
- Ưu tiên TypeScript có kiểu rõ ràng; tránh dùng `any` nếu có thể mô tả kiểu cụ thể.
- Giữ tương thích với các phiên bản package hiện có; không nâng cấp dependency chỉ để giải quyết một thay đổi nhỏ.
- Không xóa hoặc ghi đè thay đổi có sẵn của người dùng.
- Comment chỉ nên giải thích lý do hoặc quy tắc nghiệp vụ khó hiểu, không mô tả lại code hiển nhiên.

## Frontend

- Dùng Pages Router hiện tại (`frontend/pages`); không chuyển sang App Router nếu chưa được yêu cầu.
- Tái sử dụng component, hook, context và type hiện có trước khi tạo mới.
- Giữ giao diện responsive, hỗ trợ tiếng Việt và các ký tự tiếng Nhật đầy đủ.
- Giữ logic gọi API tập trung, xử lý trạng thái loading/error/empty rõ ràng.
- Không đặt secret hoặc thông tin xác thực trong code phía client.
- Sau thay đổi frontend, chạy:

  ```bash
  npm --prefix frontend run lint
  npm --prefix frontend run build
  ```

## Backend

- Giữ route, middleware, model và migration tách biệt theo cấu trúc hiện tại.
- Validate input ở biên API; không tin dữ liệu từ client.
- Dùng query có tham số hoặc query builder phù hợp, không nối chuỗi dữ liệu người dùng trực tiếp vào SQL.
- Không trả stack trace, mật khẩu, token hoặc thông tin nội bộ trong response production.
- Khi thay đổi schema, tạo migration mới trong `backend/src/migrations`; không sửa migration đã được áp dụng trừ khi đang sửa lỗi cục bộ rõ ràng.
- Giữ format response và mã HTTP nhất quán với các endpoint hiện có.
- Sau thay đổi backend, chạy:

  ```bash
  npm --prefix backend run build
  ```

## Cơ sở dữ liệu và cấu hình

- Dùng `infra/.env.example` và `backend/.env.example` làm mẫu; cấu hình thực tế nằm trong `.env` và không được commit.
- Kiểm tra migration trước khi chạy trên dữ liệu thật.
- Không chạy lệnh destructive như drop database, xóa migration hoặc xóa dữ liệu seed nếu người dùng chưa yêu cầu rõ.

## Quy trình thực hiện

1. Xác định file, route, component hoặc migration bị ảnh hưởng.
2. Kiểm tra cách triển khai tương tự trong codebase.
3. Sửa bằng thay đổi tối thiểu, giữ convention hiện có.
4. Chạy kiểm tra phù hợp với phần đã sửa.
5. Báo cáo ngắn gọn: đã thay đổi gì, đã kiểm tra gì và còn vấn đề nào chưa xử lý.

## Lệnh hữu ích

```bash
# Cài dependency và chạy cả frontend/backend
npm install
npm run dev

# Chạy riêng từng phần
npm run dev:frontend
npm run dev:backend

# Chạy migration từ root
npm run migrate
```
