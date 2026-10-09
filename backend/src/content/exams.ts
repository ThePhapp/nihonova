import type { ExamQuestion, Level } from './types';
import { source } from './metadata';

function question(level: Level, skill: ExamQuestion['skill'], prompt: string, options: string[], answer: number, explanation: string, audioText?: string): ExamQuestion {
  return { id: `exam-${level}-${skill}-01`, level, skill, prompt, options, answer, explanation, source, ...(audioText ? { audioText } : {}) };
}

// Independent practice items; listening scripts are separate from visible question prompts.
export const examQuestions: ExamQuestion[] = [
  question('N5', 'vocabulary', '「本」の読み方はどれですか。', ['みず', 'ほん', 'やま', 'そら'], 1, '本 được đọc là ほん, nghĩa là sách trong ngữ cảnh này.'),
  question('N5', 'grammar', '庭（　）花があります。', ['を', 'で', 'に', 'へ'], 2, 'に đánh dấu nơi tồn tại trong cấu trúc 場所に物があります.'),
  question('N5', 'reading', '私は毎日七時に起きます。朝ご飯を食べます。八時に学校へ行きます。\nこの人は何時に学校へ行きますか。', ['七時', '八時', '九時', '十時'], 1, 'Bài nói 八時に学校へ行きます: đi đến trường lúc tám giờ.'),
  question('N5', 'listening', '男の人はいくつ買いますか。', ['一つ', '二つ', '四つ', '三つ'], 3, 'Người nam nói 三つ, tức ba quả.', '女：りんごをいくつ買いますか。男：三つ買います。'),
  question('N5', 'kanji', '「水」の音読みはどれですか。', ['スイ', 'モク', 'ホン', 'キン'], 0, '水 có âm On スイ, ví dụ 水曜日（すいようび）.'),
  question('N4', 'vocabulary', '友達と三時に会う（　）をしました。', ['準備', '天気', '約束', '荷物'], 2, '約束をする dùng để hẹn hoặc hứa; ở đây là hẹn gặp bạn lúc ba giờ.'),
  question('N4', 'grammar', '明日の試験のために、今夜、単語を復習して（　）。', ['あります', 'おきます', 'いますか', 'しまいました'], 1, '〜ておきます diễn tả làm trước để chuẩn bị; 今夜 và 明日の試験 xác lập việc chuẩn bị sắp tới.'),
  question('N4', 'reading', '駅前の店は月曜日が休みです。今日は月曜日なので、買い物は明日します。\nこの人はいつ買い物をしますか。', ['今日', '日曜日', '来週の月曜日', '火曜日'], 3, 'Hôm nay là thứ Hai và mua sắm vào ngày mai, tức thứ Ba.'),
  question('N4', 'listening', '二人は何で行きますか。', ['電車', 'バス', '自転車', 'タクシー'], 0, 'Hai người đồng ý đi tàu sau khi xe buýt đã rời đi.', '男：バスで行きますか。女：バスはもう出ました。電車で行きましょう。男：そうしましょう。'),
  question('N4', 'kanji', '「約束」の「約」の読み方はどれですか。', ['ソク', 'ヤク', 'リョ', 'キュウ'], 1, '約 trong 約束（やくそく）được đọc là ヤク.'),
  question('N3', 'vocabulary', 'メールを送る前に、相手の名前が正しいか（　）します。', ['出発', '運動', '確認', '招待'], 2, '確認する là kiểm tra lại; ở đây kiểm tra tên người nhận có đúng không.'),
  question('N3', 'grammar', '健康のために、毎晩早く寝る（　）しています。', ['ためを', 'ことが', 'おかげを', 'ように'], 3, '〜ようにしています diễn tả cố gắng duy trì thói quen.'),
  question('N3', 'reading', '市の講座は人気があり、会場が狭く感じられた。そのため、次回は定員を増やさず、より広い部屋を使うことになった。\n次回の講座はどうなりますか。', ['広い部屋で、定員は同じ', '同じ部屋で、定員を増やす', '広い部屋で、定員を減らす', '講座を中止する'], 0, '定員を増やさず và より広い部屋 cho biết chuyển sang phòng rộng hơn mà không tăng số chỗ.'),
  question('N3', 'listening', '何が変わりましたか。', ['場所', '時間', '担当者', '曜日'], 1, 'Giờ họp đổi từ hai sang ba giờ; địa điểm vẫn như cũ.', '女：打ち合わせは午後二時でしたね。男：担当者が遅れるので、三時に変更です。場所は同じです。'),
  question('N3', 'kanji', '「改善」の「改」の読み方はどれですか。', ['ゼン', 'カク', 'カイ', 'イ'], 2, '改 trong 改善（かいぜん）được đọc là カイ, nghĩa là sửa đổi.'),
  question('N2', 'vocabulary', '資料を見ると、冬に利用者が増える（　）がある。', ['傾向', '持参', '中止', '偶然'], 0, '傾向がある nghĩa là có xu hướng, phù hợp với mẫu tăng người dùng vào mùa đông.'),
  question('N2', 'grammar', '経験が長い人なら、必ず教えるのが上手だ（　）。', ['に応じます', 'を通じます', 'とは限りません', 'に限ります'], 2, '〜とは限りません phủ định nhận định luôn đúng: có kinh nghiệm lâu chưa chắc dạy giỏi.'),
  question('N2', 'reading', 'この工場では、故障が起きてから修理する方法を改め、定期点検を増やした。点検には時間がかかるものの、突然生産が止まる回数は減った。\n変更による結果として正しいものはどれですか。', ['点検の時間が不要になった', 'すべての故障がなくなった', '生産をやめた', '急な生産停止が少なくなった'], 3, 'Bài chỉ khẳng định số lần ngừng sản xuất bất ngờ giảm, không nói mọi sự cố biến mất.'),
  question('N2', 'listening', '二人はどうすることにしましたか。', ['今の部屋に椅子を追加する', '別の広い部屋を使う', '参加者を減らす', '会議を延期する'], 1, 'Hai người chọn phòng họp lớn bên cạnh thay vì thêm ghế vào phòng hiện tại.', '男：参加者が増えたので、椅子を追加しましょうか。女：部屋が狭くなりますね。隣の大きい会議室が空いているので、そちらを使いましょう。男：分かりました。'),
  question('N2', 'kanji', '「維持」の「維」の読み方はどれですか。', ['ジ', 'テキ', 'ケイ', 'イ'], 3, '維 trong 維持（いじ）được đọc là イ.'),
  question('N1', 'vocabulary', '理想として掲げた方針と実際の運用との（　）が問題になった。', ['合意', '調和', '乖離', '一致'], 2, '乖離 diễn tả khoảng cách giữa phương châm lý tưởng và cách vận hành thực tế.'),
  question('N1', 'grammar', '利用者から寄せられた意見（　）、手続きの簡略化を検討する。', ['を踏まえて', 'に先立って', 'をよそに', 'に反して'], 0, 'を踏まえて diễn tả dùng các ý kiến đã nhận làm căn cứ xem xét đơn giản hóa thủ tục.'),
  question('N1', 'reading', '公平さを保つには共通の基準が必要だ。しかし、支援を必要とする事情は人によって異なる。基準の統一を理由に個別の事情を無視すれば、形式上は平等でも、実質的な不利益を生むことがある。\n筆者の考えに合うものはどれですか。', ['共通の基準があれば不利益は生じない', '公平さのために個別の事情は無視すべきだ', '基準は毎回無作為に決めるべきだ', '共通の基準と個別事情への配慮が必要だ'], 3, 'Tác giả công nhận cần tiêu chuẩn chung, đồng thời cảnh báo việc bỏ qua hoàn cảnh riêng có thể gây bất lợi thực chất.'),
  question('N1', 'listening', '男の人が求めている修正はどれですか。', ['結論を全国共通の事実として強調する', '調査の適用範囲の限界を示す', '調査地域の名前だけを削る', '調査をしていないと書く'], 1, 'Người nam yêu cầu ghi rõ giới hạn: khảo sát chỉ ở một vùng nên không thể khái quát ra cả nước.', '女：報告書の結論はこのままでよいでしょうか。男：調査対象が一地域に限られていますから、全国にも当てはまるとは言えません。その限界を明記してください。女：分かりました。'),
  question('N1', 'kanji', '「配慮」の「慮」の読み方はどれですか。', ['リョ', 'ハイ', 'カイ', 'シン'], 0, '慮 trong 配慮（はいりょ）được đọc là リョ, nghĩa là cân nhắc.'),
];
