# JLPT — Nền tảng học tiếng Nhật

Ứng dụng Next.js Pages Router + React + Express + PostgreSQL, giao diện tiếng Việt, dark mode và bố cục desktop/mobile. Đây là bản nền tảng hoạt động với **nội dung khởi đầu giới hạn**, không phải kho từ điển/giáo trình đầy đủ hay đề JLPT chính thức.

## Chức năng đang chạy

- Đăng ký/đăng nhập; dữ liệu học tách theo tài khoản và khôi phục từ PostgreSQL.
- Tra Nhật–Việt trong bộ nội dung tự biên soạn; tùy chọn Jotoba Nhật–Anh có nguồn/giấy phép. Lịch sử, lưu từ và flashcard SRS.
- Kanji, bảng luyện viết, ngữ pháp, bài đọc có ruby/tra từ, luyện nghe bằng giọng trình duyệt và thu âm cục bộ khi thiết bị hỗ trợ.
- Bài luyện N5–N1: 5 kỹ năng, đồng hồ, tự lưu đáp án, chấm trên server, kết quả và lịch sử.
- Dashboard dữ liệu thật, mục tiêu ngày, gợi ý kỹ năng cần ôn, cài đặt Furigana/Romaji, tìm kiếm toàn ứng dụng.
- Adapter AI tutor phía server; báo chưa khả dụng khi chưa có API key. Không có phản hồi AI hay điểm phát âm giả.

## Bắt đầu

Cần Node 22, npm và PostgreSQL 15 (hoặc Docker).

1. Chạy `npm ci` tại root.
2. Thiết lập môi trường theo [hướng dẫn setup](docs/setup.md); không ghi đè `.env` đang dùng.
3. `docker compose up -d --wait` → `npm run migrate` → `npm run dev`.
4. Mở http://localhost:3000 và tạo tài khoản. API mặc định ở cổng 4000.

Lệnh kiểm tra: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run test:e2e`, `npm run build`. Các bài cần database dùng **DB test cô lập**, không dùng DB thật; xem [setup và test](docs/setup.md).

## Tài liệu

- [Bàn giao, kết quả kiểm thử và giới hạn](docs/delivery.md)
- [Task board](docs/task-board.md), [kế hoạch](docs/implementation-plan.md), [audit ban đầu](docs/architecture-audit.md)
- [Hợp đồng API và quyền dữ liệu](docs/api-integration.md)
- [Phạm vi nội dung gốc](backend/src/content/README.md), [nghiên cứu provider](backend/src/providers/RESEARCH.md), [AI tutor](backend/src/providers/ai-notes.md)
- [Quy tắc cho AI trong repository](AGENTS.md)

Không scraping Mazii, không đưa API key lên frontend, không có tài khoản mặc định. Chưa triển khai ra môi trường public. Hướng dẫn Docker/HTTPS/backup và các việc phải làm trước production nằm trong `docs/setup.md`.
