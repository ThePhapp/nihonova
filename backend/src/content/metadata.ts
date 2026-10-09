import type { Level, Source } from './types';

export const levels: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && levels.some(level => level === value);
}

export const source: Source = {
  name: 'JLPT starter — nội dung Nhật/Việt tự biên soạn',
  license: 'Nội dung gốc của dự án; chưa công bố giấy phép tái phân phối riêng.',
};

export const coverageNotice = 'Bộ khởi đầu tự biên soạn: mỗi mức có 3 từ, 2 kanji, 2 mẫu ngữ pháp, 1 bài đọc, 1 transcript nghe và 4 câu luyện tập. Nhãn N5–N1 là mức học đề xuất, không phải phân loại chính thức hay giáo trình đầy đủ; chưa được chuyên gia chứng nhận. Bài nghe dùng văn bản/TTS, không có bản thu âm. Câu luyện tập không phải đề JLPT chính thức và không dự báo điểm thi.';
