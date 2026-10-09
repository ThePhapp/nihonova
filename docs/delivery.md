# Bàn giao checkpoint — 2026-10-09

## Kết quả thực tế

Nhánh tích hợp: `integration/japanese-platform`. Đây là bản ứng dụng học hoạt động end-to-end với nội dung khởi đầu, **chưa hoàn thành toàn bộ chiều sâu của master prompt và chưa được chứng nhận production-ready**. Không gọi API Mazii riêng tư, không chép kho bài học/đề thi, không giả dịch tiếng Việt từ dữ liệu tiếng Anh, không phát sinh lượt gọi AI trả phí.

Giữ Next Pages Router, React 18, Tailwind 3, Express và PostgreSQL; nâng Next 13.4 → 15.5.27 vì dependency audit. Bốn worker làm trong worktree riêng; GPT-5.6 không có trong công cụ, dùng `gpt-6.1-sol` medium và đã thông báo. Không có số liệu chi phí/token đáng tin từ công cụ, không tự ước tính. Các worker đã dừng sau bàn giao.

## Module và giới hạn

| Module | Đã có luồng thực | Chưa hoàn thành / điều kiện bổ sung |
|---|---|---|
| A Từ điển | Nhật/kana/romaji/Việt, fuzzy/autocomplete local, ví dụ, nguồn, lịch sử, lưu thẻ; Jotoba Nhật–Anh opt-in, timeout/cache/backoff/validation | Local chỉ 15 từ; không có kho Nhật–Việt đầy đủ, bộ chia động từ tổng quát hoặc bộ đồng/trái nghĩa đầy đủ |
| B Kanji | 10 chữ N5–N1, âm/nghĩa/bộ/số nét/từ/gợi nhớ, quiz, bảng vẽ thật, lưu hoàn thành | Chưa có dữ liệu thứ tự nét, nhận dạng chữ viết tay, bộ lọc chủ đề và danh sách ôn chuyên biệt |
| C Từ vựng/SRS | Thẻ hai mặt, TTS, gõ đáp án, trắc nghiệm từ đã lưu, server schedule và khóa chống chấm lặp, khôi phục tài khoản | Chưa có ghép cặp/điền từ riêng và nhãn từ khó/yêu thích tách biệt; thư viện nội dung nhỏ |
| D Ngữ pháp | 10 mẫu, giải thích Việt, ví dụ, tìm/lọc cấp độ, đối chiếu câu mẫu, lưu hoàn thành | Chưa có đủ bài chọn cấu trúc/sắp xếp/điền từ, so sánh mẫu gần nghĩa, bookmark cấu trúc và furigana cho mọi ví dụ |
| E JLPT | 25 câu gốc, mỗi cấp 5 kỹ năng; 10 phút, autosave trước hạn, submit đúng snapshot, server grading/ownership/idempotency, giải thích/lịch sử/tỷ lệ | Không mô phỏng độ dài/thang điểm chính thức; chưa khôi phục lượt đang thi sau reload; cần mở rộng và thẩm định ngân hàng |
| F Đọc | 5 bài gốc, ruby on/off, lookup, highlight từ lưu, font size, bản dịch tác giả, câu hỏi, lưu hoàn thành | Chưa có dịch đoạn tùy ý bằng API, nguồn tin tức/RSS hoặc tiếp tục đúng vị trí cuộn |
| G Nghe | 5 transcript gốc phát bằng TTS trình duyệt; tốc độ, transcript, quiz, dictation, ghi âm cục bộ | Phụ thuộc giọng Nhật/micro trên thiết bị; chưa có STT hay đánh giá phát âm, chưa kiểm thử micro/giọng thật trên mọi trình duyệt |
| H Tutor | Adapter Anthropic server-side, hội thoại/giải thích theo level, ngữ cảnh opt-in, giới hạn/timeouts và unavailable rõ | Chưa có key để live-test; hội thoại chỉ trong phiên UI, không lưu bền vững; hạn mức in-memory không phải trần chi phí bảo đảm |
| I Lộ trình | Level/target/phút ngày, gợi ý theo kỹ năng yếu trong bài gần nhất, hạn ôn thẻ | Chưa có placement test chuẩn hóa, kế hoạch nhiều tuần hay thông báo nhắc học |
| J Dashboard/account | Auth thật, lưu/khôi phục PostgreSQL, counters/streak/history, progress ring/bars, dark mode, preferences | Chưa có đổi/reset password, quản lý phiên từ xa, mục tiêu tuần và thống kê Kanji/ngữ pháp riêng đầy đủ |

Nguồn khởi đầu tự biên soạn: 15 từ, 10 Kanji, 10 ngữ pháp, 5 bài đọc, 5 script nghe, 25 câu thi. Cấp độ là ước lượng sư phạm, cần người dạy tiếng Nhật review trước phát hành rộng. Bộ này là nội dung học thật nhưng hữu hạn, không phải mock của một kho dữ liệu chưa kết nối.

## Kiểm tra

- Cài sạch `npm ci --ignore-scripts` trên Windows: PASS; `npm ci` trong Linux Docker: PASS.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS; 19 trang tĩnh, giữ server API riêng.
- `npm test` với DB test: **42 backend + 5 frontend hook = 47 PASS**, không skipped.
- `npm run test:integration`: **10 PASS** (9 subtest + test cha), DB PostgreSQL 15 cô lập localhost:5440. Có owner isolation, dữ liệu khôi phục, hạn thi, duplicate review/submit và đầu vào không hợp lệ.
- `npm run test:e2e` trên bản production: **28/28 PASS trong 25,2 giây**, desktop + Chromium 375px. Lượt đầu phát hiện selector “Tìm” trùng sau navbar mới, đã scope đúng vùng main. Lượt chạy sát nhau chạm rate limit thật 240/phút; đợi hết cửa sổ và chạy lại toàn bộ, không tắt limiter để ép test qua. Frontend do người dùng khởi động sau khi lệnh của agent bị môi trường từ chối.
- Jotoba: một request miễn phí thực trả 200; provider mocks bao phủ timeout/schema/rate/cache/backoff. Không live-test AI trả phí.
- Docker backend/frontend build: PASS; migration từ image backend vào DB test: PASS; Compose config với biến test: PASS. Chưa chạy rollout production có HTTPS/backup/load test.
- Responsive/keyboard/empty/error/dark mode được kiểm tra cơ bản bằng Playwright và ảnh; chưa có audit WCAG chuyên sâu hay kiểm thử Safari/Firefox/micro thật.

Audit tại checkpoint: production-only **0 advisory**, full toolchain **15 advisory (12 high, 3 moderate)**. npm 11.6.2 vẫn báo cây PostCSS `invalid` so với pin gốc Next dù phiên bản override 8.5.29 cài và build thành công; xem [setup](setup.md). Cảnh báo Next ESLint plugin chưa cấu hình còn xuất hiện; lint TypeScript hiện vẫn chạy độc lập. Không tuyên bố đã giải quyết mọi rủi ro bảo mật.

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

Các chỉnh sửa cuối QA/tài liệu có commit riêng sau bảng này; dùng `git log --oneline` để xem đầy đủ. Không chạy lệnh push, amend, reset hay rewrite lịch sử. `.env` hiện hữu được giữ nguyên; chỉ cung cấp file example tên riêng, không có secret thật trong commit mới. Credentials từng xuất hiện trong lịch sử cũ cần quản trị viên rotate nếu còn dùng.

## Vận hành và bước tiếp theo

Xem [setup local/test/deploy](setup.md), [task board](task-board.md), [phân công](agent-assignments.md), [API](api-integration.md). Bản local QA dùng database `jlpt_test` tạm thời; không dùng làm nơi lưu bài học lâu dài vì DB nằm trong tmpfs. Frontend production được người dùng khởi động ở localhost:3000, backend QA ở cổng 4000. Không deploy hay public dịch vụ bên ngoài máy.

Ưu tiên tiếp: cấu hình key riêng nếu muốn kiểm thử tutor thật (có phí), xác nhận nhà cung cấp/nội dung Nhật–Việt và speech, thẩm định/mở rộng giáo trình; triển khai các bài tập/lộ trình còn thiếu theo bảng; xử lý dev audit, CSP/session policy, shared rate/budget limits và backup trước public launch. Token hiện dùng localStorage; cần đánh giá XSS/HTTPS và đổi sang phiên cookie nếu yêu cầu bảo mật vận hành cao hơn. Proxy mặc định gom địa chỉ IP phía backend; cấu hình trusted proxy có giới hạn đúng topology trước triển khai nhiều người dùng, không tin header Forwarded tùy ý.
