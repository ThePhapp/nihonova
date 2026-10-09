import type { DictionaryEntry, Example, Level } from './types';
import { source } from './metadata';

function word(level: Level, id: string, text: string, reading: string, romaji: string, meaning: string, partOfSpeech: string, topic: string, japanese: string, vietnamese: string, conjugations?: Record<string, string>): DictionaryEntry {
  const examples: Example[] = [{ japanese, vietnamese }];
  return { id: `word-${level}-${id}`, level, word: text, reading, romaji, meanings: [meaning], meaningLanguage: 'vi', partOfSpeech, topic, examples, source, ...(conjugations ? { conjugations } : {}) };
}

// Forms are individually authored for these verbs; no generic conjugation inference.
export const words: DictionaryEntry[] = [
  word('N5', 'water', '水', 'みず', 'mizu', 'nước', 'danh từ', 'đời sống', '朝、水を飲みます。', 'Buổi sáng tôi uống nước.'),
  word('N5', 'book', '本', 'ほん', 'hon', 'sách', 'danh từ', 'học tập', 'これは日本語の本です。', 'Đây là sách tiếng Nhật.'),
  word('N5', 'eat', '食べる', 'たべる', 'taberu', 'ăn', 'động từ nhóm 2, ngoại động từ', 'đời sống', '家でパンを食べます。', 'Tôi ăn bánh mì ở nhà.', { dictionary: '食べる', polite: '食べます', negative: '食べない', past: '食べた', te: '食べて', potential: '食べられる' }),
  word('N4', 'promise', '約束', 'やくそく', 'yakusoku', 'lời hứa; cuộc hẹn', 'danh từ / động từ với する', 'quan hệ', '友達との約束を忘れました。', 'Tôi quên cuộc hẹn với bạn.'),
  word('N4', 'prepare', '準備', 'じゅんび', 'junbi', 'sự chuẩn bị', 'danh từ / động từ với する', 'đời sống', '旅行の準備は終わりました。', 'Việc chuẩn bị cho chuyến đi đã xong.'),
  word('N4', 'hurry', '急ぐ', 'いそぐ', 'isogu', 'vội; khẩn trương', 'động từ nhóm 1', 'đời sống', '電車に間に合うように急ぎます。', 'Tôi đi nhanh để kịp tàu.', { dictionary: '急ぐ', polite: '急ぎます', negative: '急がない', past: '急いだ', te: '急いで', potential: '急げる' }),
  word('N3', 'improvement', '改善', 'かいぜん', 'kaizen', 'sự cải thiện', 'danh từ / động từ với する', 'công việc', '作業の方法を改善しました。', 'Chúng tôi đã cải thiện phương pháp làm việc.'),
  word('N3', 'confirm', '確認', 'かくにん', 'kakunin', 'sự xác nhận; kiểm tra lại', 'danh từ / động từ với する', 'công việc', '送る前に住所を確認します。', 'Tôi kiểm tra lại địa chỉ trước khi gửi.'),
  word('N3', 'continue', '続ける', 'つづける', 'tsuzukeru', 'tiếp tục; duy trì', 'động từ nhóm 2, ngoại động từ', 'học tập', '短い時間でも勉強を続けます。', 'Dù chỉ một lúc, tôi vẫn duy trì việc học.', { dictionary: '続ける', polite: '続けます', negative: '続けない', past: '続けた', te: '続けて', potential: '続けられる' }),
  word('N2', 'tendency', '傾向', 'けいこう', 'keikou', 'xu hướng; khuynh hướng', 'danh từ', 'phân tích', '最近、朝に注文が増える傾向があります。', 'Gần đây có xu hướng tăng đơn hàng vào buổi sáng.'),
  word('N2', 'appropriate', '適切', 'てきせつ', 'tekisetsu', 'thích hợp; phù hợp', 'danh từ / tính từ な', 'công việc', '状況に応じて適切な方法を選びます。', 'Chúng tôi chọn phương pháp phù hợp với tình hình.'),
  word('N2', 'maintenance', '維持', 'いじ', 'iji', 'sự duy trì', 'danh từ / động từ với する', 'công việc', '品質を維持するには点検が必要です。', 'Để duy trì chất lượng, cần kiểm tra.'),
  word('N1', 'consideration', '配慮', 'はいりょ', 'hairyo', 'sự quan tâm có cân nhắc đến hoàn cảnh người khác', 'danh từ / động từ với する', 'xã hội', '夜の作業では近所への配慮が欠かせません。', 'Khi làm việc ban đêm, không thể thiếu sự lưu tâm đến hàng xóm.'),
  word('N1', 'uniform', '一律', 'いちりつ', 'ichiritsu', 'đồng loạt; theo một mức chung', 'danh từ / trạng từ / tính từ な', 'xã hội', '一律の基準では地域の違いを捉えにくい。', 'Một tiêu chuẩn chung khó phản ánh sự khác biệt giữa các vùng.'),
  word('N1', 'divergence', '乖離', 'かいり', 'kairi', 'sự cách biệt; chênh lệch', 'danh từ / động từ với する', 'phân tích', '計画と現場の実態に乖離が生じた。', 'Đã xuất hiện khoảng cách giữa kế hoạch và thực tế tại hiện trường.'),
];
