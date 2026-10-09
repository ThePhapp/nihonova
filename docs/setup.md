# Chạy, kiểm thử và triển khai

## Local (Node 22, npm, Docker)

1. `npm ci` ở root.
2. Chép `.env.example` thành `.env`; đặt mật khẩu PostgreSQL riêng. Không ghi đè `.env` đã có.
3. Chép `backend/.env.platform.example` thành `backend/.env`; điền cùng thông tin PostgreSQL. Dùng `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` để tự tạo JWT_SECRET, lưu vào file riêng không commit.
4. Chép `frontend/.env.platform.example` thành `frontend/.env`, hoặc chỉnh hai biến tương ứng trong file hiện có. Để NEXT_PUBLIC_API_URL trống để dùng proxy cùng origin. API_INTERNAL_URL chỉ dùng trên server.
5. `docker compose up -d --wait` (PostgreSQL tại 127.0.0.1:5433).
6. `npm run migrate`. Migration bổ sung bảng, có transaction và version ledger; không xóa bảng/từ cũ. Nếu dữ liệu email cũ trùng sau chuẩn hóa, migration rollback để quản trị viên xử lý.
7. `npm run dev`; mở http://localhost:3000, API http://localhost:4000. Tạo tài khoản qua UI, không có tài khoản/mật khẩu mặc định.

Nếu có PostgreSQL riêng, không cần chạy Docker; đặt DATABASE_URL trong backend/.env. Dữ liệu học lưu trong PostgreSQL; token phiên ở localStorage, theme ở trình duyệt. Đăng xuất xóa token phía trình duyệt. Cần HTTPS và CSP phù hợp khi triển khai thực tế vì token kiểu Bearer chịu rủi ro XSS; chưa có quản lý/thu hồi toàn bộ phiên từ xa.

## Kiểm thử cô lập

```
npm run test:db
```

Database test: `postgresql://jlpt_test:local_test_only@127.0.0.1:5440/jlpt_test`. Đây là mật khẩu chỉ dành cho DB test bind localhost, dữ liệu nằm trong tmpfs. Không dùng cấu hình này cho production.

PowerShell, terminal kiểm thử:

```powershell
$env:TEST_DATABASE_URL='postgresql://jlpt_test:local_test_only@127.0.0.1:5440/jlpt_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
$env:JWT_SECRET='local-tests-only-secret-at-least-32-characters'
npm run migrate
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

Integration suite từ chối database không phải local `jlpt_test`. Foundation integration dùng schema mới riêng; không xóa schema của người dùng. Mật khẩu và token test không dùng cho môi trường khác.

E2E chạy với backend cùng database test ở terminal riêng (giữ DATABASE_URL/JWT_SECRET, đặt PORT=4000), và frontend tại localhost:3000 với API_INTERNAL_URL=http://127.0.0.1:4000. Không chạy Next dev và Next build đồng thời vì dùng chung `.next`.

```
npx playwright install chromium
npm run test:e2e
```

Playwright config chạy desktop và Chromium màn 375px (không phải kiểm thử Safari/iOS thật). Screenshot/trace nằm ở test-results/, báo cáo ở playwright-report/; các file này không commit. Có thể dùng E2E_BASE_URL để đổi URL máy local đã cấu hình. Unit/provider tests không gọi dịch vụ AI trả phí.

Khi chạy toàn bộ E2E liên tiếp trên cùng backend, chờ ít nhất một phút giữa các lượt để tôn trọng limiter 240 request/phút. Nếu gặp 429, đọc `Retry-After`; không tắt limiter hoặc chạy tests vào dịch vụ public.

## Provider

- Local: nội dung Nhật–Việt tự biên soạn, giới hạn và cấp độ ước lượng; không phải giáo trình/đề thi JLPT chính thức. Xem backend/src/content/README.md.
- Jotoba: chọn Nhật–Anh trong từ điển; không cần API key. Có timeout, cache 60 giây và hạn mức thấp để tôn trọng fair use. Không có cấp JLPT/chủ đề/romaji được xác minh cho kết quả online. Nguồn/giấy phép đi kèm từng từ và thẻ đã lưu.
- Mazii: chưa bật, chưa xác minh giấy phép API; crawler cũ bị vô hiệu hóa.
- Tutor: chỉ cấu hình ANTHROPIC_API_KEY trên backend; AI_MODEL tùy chọn. Mặc định model trong adapter được ghi ở backend/src/providers/ai-notes.md. Có thể phát sinh phí khi người dùng gửi câu hỏi. Trạng thái “available” nghĩa là đã cấu hình, không phải đã kiểm tra key trên dịch vụ. Không có paid live test trong đợt triển khai này.
- Giới hạn tutor: 6 yêu cầu/phút/người, 1.024 output tokens/lần, 100.000 tokens/ngày/người, tổng 4 yêu cầu đồng thời; giới hạn nằm trong bộ nhớ và reset khi restart. Muốn bảo đảm ngân sách tiền hoặc chạy nhiều replica cần bộ đếm bền vững và hạn mức tại provider.
- Nghe: SpeechSynthesis cần giọng tiếng Nhật trên thiết bị. Thu âm cần quyền microphone, HTTPS hoặc localhost. Không gửi bản ghi ra server, không có STT/chấm phát âm giả. Nội dung dịch ở bài đọc là bản dịch tự biên soạn; chưa có dịch đoạn tùy ý bằng AI.

## Container / production

Dockerfile có target backend và frontend, chạy bằng user node. Root .env cần POSTGRES_PASSWORD, JWT_SECRET, APP_ORIGIN. API đi qua Next proxy; backend không public port trong Compose overlay.

```
docker compose -f docker-compose.yml -f infra/docker-compose.app.yml build
docker compose -f docker-compose.yml -f infra/docker-compose.app.yml up -d postgres
docker compose -f docker-compose.yml -f infra/docker-compose.app.yml run --rm backend node backend/dist/scripts/run-migrations.js
docker compose -f docker-compose.yml -f infra/docker-compose.app.yml up -d backend frontend
```

Đặt reverse proxy HTTPS trước localhost:3000. Backup PostgreSQL trước migration, giữ nguyên volume postgres_data. Nếu DB volume cũ đã tồn tại, thay env password không tự đổi password trong DB; quản lý credentials của DB hiện hữu riêng. Không chạy `down -v` trên dữ liệu học cần giữ.

File cấu hình chứa credentials đã được bỏ khỏi cây mã hiện tại; thông tin từng được commit vẫn có thể tồn tại trong lịch sử Git. Nếu credentials cũ còn dùng ở bất kỳ môi trường nào, quản trị viên cần thay chúng. Đợt này không tự đổi password của DB hiện hữu hoặc viết lại lịch sử Git.

Health: GET /api/health kiểm tra process; /api/health/ready kiểm tra schema/database. Trước khi mở public, xử lý dependency audit còn tồn tại, kiểm tra nội dung bằng người dạy tiếng Nhật, bổ sung logging/backup, limiter chia sẻ khi scale và giám sát chi phí provider. Đợt này không publish/push/deploy ra ngoài máy.

## Dependency audit (2026-10-09)

Next đã được nâng từ 13.4 lên 15.5.27 để xử lý cảnh báo bảo mật, giữ Pages Router/React 18. PostCSS được override/pin 8.5.29 trong manifest và lockfile, gồm bản lồng trong Next. Cài sạch `npm ci` và build đã qua trên Windows; không dùng `npm audit fix --force`.

`npm audit --omit=dev`: 0 cảnh báo tại thời điểm kiểm tra. Full audit: 15 cảnh báo (12 high, 3 moderate), tập trung ở chuỗi braces/chokidar/micromatch và postcss-selector-parser của công cụ phát triển. Không có nghĩa ứng dụng được chứng nhận an toàn. Chưa nâng toàn bộ Tailwind/ESLint/TypeScript sang major mới trong đợt này; không đưa glob/CSS đầu vào không tin cậy cho build tools.

Lưu ý npm 11.6.2 trên máy kiểm tra: `npm ls postcss` báo ELSPROBLEMS do so với pin 8.4.31 của Next dù bản thực được cài là 8.5.29 và override/lockfile được kiểm tra. Cần giữ lockfile, kiểm tra lại version/audit sau mọi lần cập nhật dependency; chưa coi cảnh báo cây dependency này đã được xử lý dứt điểm.
