import type { Grammar, Kanji, Level } from './types';
import { source } from './metadata';

function character(level: Level, text: string, onyomi: string[], kunyomi: string[], meaning: string, radical: string, strokes: number, mnemonic: string, words: string[]): Kanji {
  return { id: `kanji-${level}-${text}`, character: text, level, onyomi, kunyomi, meaning, radical, strokes, mnemonic, words, source };
}

export const kanji: Kanji[] = [
  character('N5', '水', ['スイ'], ['みず'], 'nước', '水', 4, 'Hãy tưởng tượng dòng nước tỏa sang hai bên; đây chỉ là mẹo nhớ hình.', ['水', '水曜日']),
  character('N5', '本', ['ホン'], ['もと'], 'sách; gốc', '木', 5, 'Vạch ở chân cây giúp liên tưởng đến gốc; nhớ thêm nghĩa sách qua 本を読む.', ['本', '日本']),
  character('N4', '旅', ['リョ'], ['たび'], 'chuyến đi; du lịch', '方', 10, 'Liên tưởng một đoàn người mang đồ đi xa; mẹo nhớ không phải giải thích nguồn gốc chữ.', ['旅行', '旅']),
  character('N4', '約', ['ヤク'], [], 'hẹn; ước định; khoảng', '糸', 9, 'Sợi chỉ nhắc ta gắn kết lời hứa giữa hai người.', ['約束', '予約']),
  character('N3', '改', ['カイ'], ['あらためる', 'あらたまる'], 'sửa đổi', '攴', 7, 'Liên tưởng bàn tay sửa một vật cũ để nhớ nghĩa thay đổi.', ['改善', '改札']),
  character('N3', '確', ['カク'], ['たしか', 'たしかめる'], 'chắc chắn; xác thực', '石', 15, 'Đá vững chắc gợi ý điều đã được kiểm tra chắc chắn.', ['確認', '確実']),
  character('N2', '維', ['イ'], [], 'duy trì; liên kết', '糸', 14, 'Sợi chỉ giữ các phần lại với nhau, giống việc duy trì một hệ thống.', ['維持', '繊維']),
  character('N2', '適', ['テキ'], [], 'phù hợp', '辵', 14, 'Liên tưởng con đường dẫn đến phương án phù hợp.', ['適切', '適用']),
  character('N1', '慮', ['リョ'], [], 'cân nhắc; suy nghĩ', '心', 15, 'Phần tâm ở dưới gợi việc suy xét bằng cả sự quan tâm.', ['配慮', '考慮']),
  character('N1', '乖', ['カイ'], [], 'lệch; trái', '丿', 8, 'Liên tưởng hai hướng tách ra để nhớ sự cách biệt trong 乖離.', ['乖離']),
];

function pattern(level: Level, id: string, title: string, structure: string, explanation: string, japanese: string, vietnamese: string): Grammar {
  return { id: `grammar-${level}-${id}`, level, title, structure, explanation, examples: [{ japanese, vietnamese }], source };
}

export const grammar: Grammar[] = [
  pattern('N5', 'location', '〜にあります', 'Địa điểm + に + vật + が + あります', 'Diễn tả nơi có đồ vật hoặc thực vật. Với người và động vật dùng います.', '机の上に本があります。', 'Có một quyển sách trên bàn.'),
  pattern('N5', 'invitation', '〜ませんか', 'Động từ thể ます bỏ ます + ませんか', 'Lời mời lịch sự cùng thực hiện hành động; không chỉ là câu hỏi phủ định.', '日曜日に一緒に映画を見ませんか。', 'Chủ nhật chúng ta cùng xem phim nhé?'),
  pattern('N4', 'experience', '〜たことがあります', 'Động từ thể た + ことがあります', 'Nói về trải nghiệm đã từng có, thường không gắn với một thời điểm cụ thể.', '京都で自転車を借りたことがあります。', 'Tôi đã từng thuê xe đạp ở Kyoto.'),
  pattern('N4', 'preparation', '〜ておきます', 'Động từ thể て + おきます', 'Làm trước để chuẩn bị cho một việc sau đó; cũng có thể giữ nguyên trạng thái.', '会議の前に資料を読んでおきます。', 'Tôi sẽ đọc trước tài liệu để chuẩn bị cho cuộc họp.'),
  pattern('N3', 'habit', '〜ようにしています', 'Động từ thể từ điển / ない + ようにしています', 'Thể hiện nỗ lực duy trì một thói quen có chủ ý, không khẳng định lúc nào cũng làm được.', '毎日、少しでも歩くようにしています。', 'Tôi cố gắng đi bộ mỗi ngày dù chỉ một chút.'),
  pattern('N3', 'thanks', '〜おかげで', 'Thể thông thường + おかげで; danh từ + の; tính từ な + な', 'Nêu nguyên nhân mang lại kết quả tốt và thường có sắc thái biết ơn.', '友達が手伝ってくれたおかげで、引っ越しが早く終わりました。', 'Nhờ bạn giúp mà việc chuyển nhà đã xong sớm.'),
  pattern('N2', 'according', '〜に応じて', 'Danh từ + に応じて', 'Điều chỉnh hành động theo điều kiện hoặc mức độ; nhấn mạnh sự tương ứng.', '人数に応じて、部屋の広さを変えます。', 'Chúng tôi thay đổi diện tích phòng tùy theo số người.'),
  pattern('N2', 'notnecessarily', '〜とは限りません', 'Mệnh đề thể thông thường + とは限りません', 'Phủ định việc một nhận định luôn đúng; vẫn có thể đúng trong một số trường hợp.', '値段が高い商品が使いやすいとは限りません。', 'Sản phẩm đắt tiền chưa chắc đã dễ sử dụng.'),
  pattern('N1', 'given', '〜を踏まえて', 'Danh từ + を踏まえて', 'Lấy thông tin, kết quả hoặc tình hình làm căn cứ cho quyết định tiếp theo; thường dùng trong văn cảnh trang trọng.', '試験運用の結果を踏まえて、導入の範囲を見直します。', 'Dựa trên kết quả vận hành thử, chúng tôi xem xét lại phạm vi triển khai.'),
  pattern('N1', 'despite', '〜にもかかわらず', 'Động từ / tính từ い thể thông thường + にもかかわらず; danh từ / tính từ な + であるにもかかわらず', 'Diễn tả kết quả trái với điều được kỳ vọng từ tình huống trước; văn phong tương đối trang trọng.', '十分に説明したにもかかわらず、誤解は解消されなかった。', 'Dù đã giải thích đầy đủ, sự hiểu lầm vẫn chưa được giải quyết.'),
];
