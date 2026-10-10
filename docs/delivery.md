# Bàn giao checkpoint — 2026-10-10

## Kết quả thực tế

Nhánh hiện tại: `main`. Đây là bản ứng dụng học hoạt động end-to-end, đã được harden để triển khai self-hosted một backend replica có kiểm soát với nội dung khởi đầu. Bản này **không phải giáo trình JLPT hoàn chỉnh, chưa được chứng nhận cho phát hành public quy mô lớn**. Không gọi API Mazii riêng tư, không chép kho bài học/đề thi, không giả dịch tiếng Việt từ dữ liệu tiếng Anh, không phát sinh lượt gọi AI trả phí.

Giữ Next Pages Router, React 18, Tailwind 3, Express và PostgreSQL; nâng Next 13.4 → 15.5.27 vì dependency audit. Bốn worker làm trong worktree riêng; GPT-5.6 không có trong công cụ, dùng `gpt-6.1-sol` medium và đã thông báo. Không có số liệu chi phí/token đáng tin từ công cụ, không tự ước tính. Các worker đã dừng sau bàn giao.

## Module và giới hạn

| Module | Đã có luồng thực | Chưa hoàn thành / điều kiện bổ sung |
|---|---|---|
| A Từ điển | Nhật/kana/romaji/Việt, fuzzy/autocomplete local, ví dụ, nguồn, lịch sử, lưu thẻ; Jotoba Nhật–Anh opt-in, timeout/cache/backoff/validation | Local chỉ 15 từ; không có kho Nhật–Việt đầy đủ, bộ chia động từ tổng quát hoặc bộ đồng/trái nghĩa đầy đủ |
| B Kanji | 10 chữ N5–N1, âm/nghĩa/bộ/số nét/từ/gợi nhớ, quiz, bảng vẽ thật, lưu hoàn thành | Chưa có dữ liệu thứ tự nét, nhận dạng chữ viết tay, bộ lọc chủ đề và danh sách ôn chuyên biệt |
| C Từ vựng/SRS | Thẻ hai mặt, TTS, gõ đáp án, trắc nghiệm từ đã lưu, server schedule và khóa chống chấm lặp, khôi phục tài khoản | Chưa có ghép cặp/điền từ riêng và nhãn từ khó/yêu thích tách biệt; thư viện nội dung nhỏ |
| D Ngữ pháp | 10 mẫu, giải thích Việt, ví dụ, tìm/lọc cấp độ, đối chiếu câu mẫu, lưu hoàn thành | Chưa có đủ bài chọn cấu trúc/sắp xếp/điền từ, so sánh mẫu gần nghĩa, bookmark cấu trúc và furigana cho mọi ví dụ |
| E JLPT | 25 câu gốc, mỗi cấp 5 kỹ năng; 10 phút, autosave trước hạn, khôi phục lượt và đáp án sau reload, submit đúng snapshot, server grading/ownership/idempotency, giải thích/lịch sử/tỷ lệ | Không mô phỏng độ dài/thang điểm chính thức; cần mở rộng và thẩm định ngân hàng |
| F Đọc | 5 bài gốc, ruby on/off, lookup, highlight từ lưu, font size, bản dịch tác giả, câu hỏi, lưu hoàn thành | Chưa có dịch đoạn tùy ý bằng API, nguồn tin tức/RSS hoặc tiếp tục đúng vị trí cuộn |
| G Nghe | 5 transcript gốc phát bằng TTS trình duyệt; tốc độ, transcript, quiz, dictation, ghi âm cục bộ | Phụ thuộc giọng Nhật/micro trên thiết bị; chưa có STT hay đánh giá phát âm, chưa kiểm thử micro/giọng thật trên mọi trình duyệt |
| H Tutor | Adapter Anthropic server-side, hội thoại/giải thích theo level, ngữ cảnh opt-in, giới hạn/timeouts và unavailable rõ | Chưa có key để live-test; hội thoại chỉ trong phiên UI, không lưu bền vững; hạn mức in-memory không phải trần chi phí bảo đảm |
| I Lộ trình | Level/target/phút ngày, gợi ý theo kỹ năng yếu trong bài gần nhất, hạn ôn thẻ | Chưa có placement test chuẩn hóa, kế hoạch nhiều tuần hay thông báo nhắc học |
| J Dashboard/account | Auth thật bằng cookie HttpOnly, đổi mật khẩu và thu hồi phiên cũ, lưu/khôi phục PostgreSQL, counters/streak/history, progress ring/bars, dark mode, preferences | Chưa có reset password qua email, liệt kê/thu hồi từng thiết bị từ xa, mục tiêu tuần và thống kê Kanji/ngữ pháp riêng đầy đủ |

Nguồn khởi đầu tự biên soạn: 15 từ, 10 Kanji, 10 ngữ pháp, 5 bài đọc, 5 script nghe, 25 câu thi. Cấp độ là ước lượng sư phạm, cần người dạy tiếng Nhật review trước phát hành rộng. Bộ này là nội dung học thật nhưng hữu hạn, không phải mock của một kho dữ liệu chưa kết nối.

## Kiểm tra

- Cài sạch `npm ci --ignore-scripts` trên Windows: PASS; `npm ci` trong Linux Docker: PASS.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS; lint bao phủ frontend/backend và Next Core Web Vitals; 19 trang tĩnh, giữ server API riêng.
- `npm test` với DB test: **43 backend + 5 frontend hook = 48 PASS**, không skipped.
- `npm run test:integration`: **11 PASS** (10 subtest + test cha), DB PostgreSQL 15 cô lập localhost:5440. Có owner isolation, dữ liệu khôi phục, hạn thi, duplicate review/submit, đổi mật khẩu/thu hồi phiên và đầu vào không hợp lệ.
- `npm run test:e2e` trên bản production: **28/28 PASS trong 37,0 giây**, desktop + Chromium 375px. Bao phủ cookie không lưu token, khôi phục lượt thi/đáp án qua reload, đổi mật khẩu/thu hồi phiên/đăng nhập lại, các luồng nội dung, tìm kiếm và mobile. Một lượt trước đó bắt được lỗi console 401 trên trang public; endpoint session ẩn danh đã được sửa và toàn bộ suite chạy lại, không tắt kiểm tra console hay limiter.
- Jotoba: một request miễn phí thực trả 200; provider mocks bao phủ timeout/schema/rate/cache/backoff. Không live-test AI trả phí.
- Docker backend/frontend build: PASS; migration từ image backend vào DB test: PASS; Compose config với migrate gate và healthcheck: PASS. Chưa chạy rollout public có HTTPS/backup-restore/load test.
- Responsive/keyboard/empty/error/dark mode được kiểm tra bằng Playwright, probe và ảnh ở 1280/375 px; giao diện giữ hệ flat indigo hiện có. Chưa có audit WCAG chuyên sâu hay kiểm thử Safari/Firefox/micro thật.

Audit tại checkpoint: production-only **0 advisory**, full toolchain phát triển **16 advisory (13 high, 3 moderate)**. npm 11.6.2 vẫn báo cây PostCSS `invalid` so với pin gốc Next dù phiên bản override 8.5.29 cài và build thành công; xem [setup](setup.md). Next ESLint plugin/Core Web Vitals đã được cấu hình và lint bao phủ toàn bộ TypeScript. Không tuyên bố đã giải quyết mọi rủi ro bảo mật.

## Các commit tích hợp chính

| Task / phần | Hash trên nhánh tích hợp |
|---|---|
| Rule AI | `2b1a8a5` |
| T00 audit/contracts | `89bdea7` |
| T01 local content + Jotoba + hardening | `63e9282`, `dc31f13`, `1ec2471` |
| T02 runtime/auth/database | `a6a550c` |
| T03 shell + global search + target links | `4f7a03a`, `c56f3ed`, `64c564a` |
| T04 dictionary UI | `b557764` |
| T05 Kanji/grammar | `2c2964f` |
| T06 SRS server/client | `0e14532`, `08e39c9` |
| T07 exam/client/autosave/server/audio | `876a3a5`, `b6b8b5a`, `63933d1`, `af73730`, `7e0b990` |
| T08 reader/listening + lifecycle fix | `3e2082f`, `32a157f` |
| T09 tutor UI/provider | `23f6e23`, `d2f4a1f` |
| T10 dashboard/settings/ring | `b9fbd25`, `efe7b4c` |
| T11 browser tests / runtime wiring / QA tooling / final selector | `4543e8f`, `2ee6e02`, `8dcbfc3`, `7c5690b` |
| Khôi phục lượt thi đang làm | `741c170` |
| Cookie session, đổi mật khẩu và thu hồi phiên | `7565101` |
| Runtime/Compose/security headers/healthcheck | `6b24f79` |
| Lint đầy đủ frontend/backend | `240e166` |
| Session probe ẩn danh không gây console 401 | `88ec949` |

Các chỉnh sửa cuối QA/tài liệu có commit riêng sau bảng này; dùng `git log --oneline` để xem đầy đủ. Không chạy lệnh push, amend, reset hay rewrite lịch sử. `.env` hiện hữu được giữ nguyên; chỉ cung cấp file example tên riêng, không có secret thật trong commit mới. Credentials từng xuất hiện trong lịch sử cũ cần quản trị viên rotate nếu còn dùng.

## Vận hành và bước tiếp theo

Xem [setup local/test/deploy](setup.md), [task board](task-board.md), [phân công](agent-assignments.md), [API](api-integration.md). Bản local QA dùng database `jlpt_test` tạm thời; không dùng làm nơi lưu bài học lâu dài vì DB nằm trong tmpfs. Không deploy hay public dịch vụ bên ngoài máy và không push Git.

Ưu tiên tiếp: cấu hình key riêng nếu muốn kiểm thử tutor thật (có phí), xác nhận nhà cung cấp/nội dung Nhật–Việt và speech, nhờ giáo viên thẩm định/mở rộng giáo trình; hoàn thiện placement/lộ trình/bài tập còn thiếu; diễn tập backup-restore, kiểm thử tải và trình duyệt Safari/Firefox/micro thật. Trước khi chạy nhiều backend replica, thay limiter/budget in-memory bằng bộ đếm chia sẻ. Khi public, chốt topology proxy chính xác, HTTPS/HSTS, giám sát/cảnh báo và quy trình reset mật khẩu/thu hồi thiết bị.
