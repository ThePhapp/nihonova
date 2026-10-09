import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ProtectedLayout from '../components/layout/ProtectedLayout'
import Flashcard from '../components/study/Flashcard'
import { useLearningState } from '../hooks/useLearningState'
import { useAuth } from '../contexts/AuthContext'
import { Card, levels } from '../types/learning'
import { api, ApiError, errorMessage } from '../utils/api'
import { isDue } from '../utils/study'
function StudySession() {
  const { data, error, loading, refresh } = useLearningState()
  const [overrides, setOverrides] = useState<Record<string, Card>>({})
  const [now, setNow] = useState(Date.now())
  const [level, setLevel] = useState('')
  const [onlyDue, setOnlyDue] = useState(true)
  const [mode, setMode] = useState<'flashcard' | 'typing' | 'choice'>('flashcard')
  const [index, setIndex] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const cards = (data?.cards || []).map(card => overrides[card.id] || card)
  const filtered = cards.filter(card => (!level || card.entry.level === level) && (!onlyDue || isDue(card, now)))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const current = filtered[index % (filtered.length || 1)]
  async function rate(rating: 0 | 1 | 2 | 3) {
    if (!current || saving.current || !isDue(current, Date.now())) return
    saving.current = true; setBusy(true); setMessage('')
    try {
      const card = await api<Card>(`/api/me/cards/${encodeURIComponent(current.id)}/review`, { method: 'POST', body: JSON.stringify({ rating }) })
      setOverrides(prev => ({ ...prev, [card.id]: card }))
      setReviewed(value => value + 1); setNow(Date.now())
      setMessage(`Đã lưu đánh giá. Lần ôn tiếp: ${new Date(card.dueAt).toLocaleString('vi-VN')}.`)
    } catch (failure) {
      setMessage(errorMessage(failure))
      if (failure instanceof ApiError && failure.status === 409) await refresh()
    } finally { saving.current = false; setBusy(false) }
  }
  if (loading && !data) return <p className="notice" role="status">Đang tải thẻ ôn tập…</p>
  if (error && !data) return <section className="notice" role="alert">{error} <button className="btn" type="button" onClick={() => void refresh()}>Thử lại</button></section>
  return <div className="space-y-6">
    <div><h1 className="page-heading">Ôn tập thẻ đã lưu</h1><p className="muted mt-2">Lịch ôn được lưu trên tài khoản. Thẻ chưa đến hạn chỉ có thể xem trước.</p></div>
    <div className="panel grid gap-3 sm:grid-cols-3">
      <div><label htmlFor="study-level">Cấp độ</label><select id="study-level" className="field mt-1" value={level} disabled={busy} onChange={e => { setLevel(e.target.value); setIndex(0) }}><option value="">Tất cả (kể cả chưa rõ)</option>{levels.map(value => <option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor="study-mode">Cách ôn</label><select id="study-mode" className="field mt-1" value={mode} disabled={busy} onChange={e => setMode(e.target.value as typeof mode)}><option value="flashcard">Tự nhớ nghĩa</option><option value="typing">Gõ tiếng Nhật</option><option value="choice">Chọn đáp án từ thẻ đã lưu</option></select></div>
      <div><label htmlFor="study-filter">Lịch ôn</label><select id="study-filter" className="field mt-1" disabled={busy} value={onlyDue ? 'due' : 'all'} onChange={e => { setOnlyDue(e.target.value === 'due'); setIndex(0) }}><option value="due">Chỉ thẻ đến hạn</option><option value="all">Tất cả / xem trước</option></select></div>
    </div>
    <p className="muted tabular-nums">{filtered.length} thẻ phù hợp · Đã lưu {reviewed} đánh giá trong phiên này.</p>
    {message && <p className="notice" role="status">{message}</p>}
    {error && data && <p className="notice" role="alert">{error} <button className="btn" type="button" onClick={() => void refresh()}>Tải lại</button></p>}
    {current && data ? <div className="max-w-3xl space-y-4">
      <Flashcard key={`${current.id}:${current.lastReviewed}:${mode}`} card={current} cards={cards} preferences={data.preferences} mode={mode} busy={busy} canRate={isDue(current, now)} onRate={rating => void rate(rating)} />
      {!onlyDue && filtered.length > 1 && <button className="btn" type="button" disabled={busy} onClick={() => setIndex(value => value + 1)}>Xem thẻ tiếp</button>}
    </div> : <section className="panel space-y-4">
      <h2 className="text-lg font-semibold">{cards.length ? 'Đã hết thẻ phù hợp đến hạn' : 'Chưa có thẻ ôn tập'}</h2>
      <p className="muted">{cards.length ? 'Thẻ sẽ tự xuất hiện khi đến hạn. Bạn có thể xem trước hoặc tìm thêm từ mới.' : 'Tra một từ và lưu thẻ để bắt đầu ôn tập.'}</p>
      <Link className="btn btn-primary" href="/dictionary">Tra và lưu từ</Link>
      <button className="btn ml-2" type="button" onClick={() => void refresh()}>Kiểm tra lại</button>
    </section>}
  </div>
}
export default function StudyPage() {
  const { user } = useAuth()
  return <ProtectedLayout><StudySession key={user?.id || 'guest'} /></ProtectedLayout>
}
