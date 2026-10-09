import { FormEvent, useState } from 'react'
import { Card, Preferences } from '../../types/learning'
import { acceptsAnswer, choiceWords } from '../../utils/study'
import EntryCard from '../vocabulary/EntryCard'
type Mode = 'flashcard' | 'typing' | 'choice'
export default function Flashcard({ card, cards, preferences, mode, busy, canRate, onRate }: {
  card: Card; cards: Card[]; preferences: Preferences; mode: Mode; busy: boolean; canRate: boolean
  onRate: (rating: 0 | 1 | 2 | 3) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const choices = choiceWords(card, cards)
  function check(value: string) {
    setAnswer(value)
    setFeedback(acceptsAnswer(card, value) ? 'Khớp với từ hoặc cách đọc đã lưu.' : 'Chưa khớp. So sánh với đáp án bên dưới rồi tự đánh giá.')
    setRevealed(true)
  }
  function submit(event: FormEvent) { event.preventDefault(); check(answer) }
  return <div className="space-y-4">
    {!revealed ? <section className="panel space-y-5">
      {mode === 'flashcard' ? <>
        <h2 className="text-3xl font-semibold text-center py-6" lang="ja">{card.entry.word}</h2>
        <p className="muted text-center">Thử nhớ cách đọc và nghĩa trước khi xem đáp án.</p>
      </> : <>
        <h2 className="text-base font-semibold">Từ tiếng Nhật nào có nghĩa này?</h2>
        <p lang={card.entry.meaningLanguage === 'en' ? 'en' : 'vi'}>{card.entry.meanings.join('; ')}</p>
        <p className="muted">Nghĩa {card.entry.meaningLanguage === 'en' ? 'tiếng Anh' : 'tiếng Việt'} từ thẻ đã lưu.</p>
        {mode === 'typing' ? <form className="space-y-3" onSubmit={submit}>
          <label htmlFor="study-answer">Nhập từ hoặc cách đọc tiếng Nhật</label>
          <input className="field" id="study-answer" lang="ja" maxLength={200} value={answer} onChange={e => setAnswer(e.target.value)} autoComplete="off" />
          <button className="btn" type="submit" disabled={!answer.trim()}>Kiểm tra đáp án</button>
        </form> : choices.length ? <div className="grid gap-3 sm:grid-cols-2">{choices.map(word => <button key={word} type="button" className="btn" lang="ja" onClick={() => check(word)}>{word}</button>)}</div> :
          <p className="notice">Cần thêm một thẻ có nghĩa khác để tạo lựa chọn. Bạn vẫn có thể xem đáp án và tự đánh giá.</p>}
      </>}
      <button className="btn btn-primary" type="button" onClick={() => setRevealed(true)}>Xem đáp án</button>
    </section> : <>
      {feedback && <p className="notice" role="status">{feedback}{answer && <> Câu trả lời: <span lang="ja">{answer}</span></>}</p>}
      <EntryCard entry={card.entry} furigana={preferences.furigana} romaji={preferences.romaji} />
    </>}
    {canRate ? <fieldset disabled={!revealed || busy} className="space-y-3">
      <legend className="font-medium">Đánh giá sau khi xem đáp án</legend>
      <p className="muted">Máy chủ lưu lịch ôn theo đánh giá của bạn. Kiểm tra gõ từ/trắc nghiệm chỉ hỗ trợ tự đánh giá.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['Quên (0)', 'Khó (1)', 'Nhớ (2)', 'Dễ (3)'] as const).map((label, i) => <button type="button" className="btn" key={label} onClick={() => onRate(i as 0 | 1 | 2 | 3)}>{busy ? 'Đang lưu…' : label}</button>)}
      </div>{!revealed && <p className="muted">Mở đáp án để đánh giá thẻ.</p>}
    </fieldset> : <p className="notice">Thẻ chưa đến hạn; xem trước không làm thay đổi lịch ôn.</p>}
  </div>
}
