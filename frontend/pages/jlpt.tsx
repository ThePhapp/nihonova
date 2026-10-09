import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/utils/api'
import { errorText, ExamResult, jsonPost, LearningPage, LearningState, Level, LevelSelect, ResourceStatus, useResource } from '@/components/learning/shared'

type Attempt = { id: string; level: Level; expiresAt: string; questions: { id: string; skill: string; prompt: string; options: string[] }[] }
function Result({ result }: { result: ExamResult }) {
  return <section className="panel space-y-4 p-5"><h2 className="text-2xl font-bold">Kết quả luyện tập {result.level}: {result.score}/{result.total}</h2><p className="muted">Do máy chủ chấm. Điểm này không quy đổi sang điểm chuẩn hoặc chứng nhận JLPT.</p><ul>{Object.entries(result.bySkill).map(([skill, value]) => <li key={skill}>{skill}: {value.correct}/{value.total}</li>)}</ul><ol className="space-y-3">{result.answers.map((answer, index) => <li key={answer.questionId}><p>Câu {index + 1}: {answer.correct ? 'Đúng' : 'Sai hoặc bỏ trống'} · Đáp án số {answer.correctAnswer + 1}</p><p>{answer.explanation}</p></li>)}</ol></section>
}
export default function JlptPage() {
  const { user, isLoading } = useAuth()
  const [level, setLevel] = useState<Level>('N5')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const inFlight = useRef(false)
  const expiredSubmit = useRef('')
  const controller = useRef<AbortController | null>(null)
  const history = useResource<LearningState>(user ? '/api/me/state' : null, user?.id)
  useEffect(() => {
    controller.current?.abort(); inFlight.current = false
    setAttempt(null); setAnswers({}); setResult(null); setError(''); setBusy(false)
    return () => controller.current?.abort()
  }, [user?.id])
  async function start() {
    if (inFlight.current) return
    const request = new AbortController(); controller.current = request
    inFlight.current = true; setBusy(true); setError('')
    try {
      const value = await api<Attempt>('/api/exams/start', { ...jsonPost({ level }), signal: request.signal })
      if (request.signal.aborted) return
      setAttempt(value); setAnswers({}); setResult(null); expiredSubmit.current = ''
      setRemaining(Math.max(0, Math.ceil((Date.parse(value.expiresAt) - Date.now()) / 1000)))
    } catch (reason) { if (!request.signal.aborted) setError(errorText(reason)) }
    finally { if (!request.signal.aborted) { inFlight.current = false; setBusy(false) } }
  }
  const submit = useCallback(async () => {
    if (!attempt || inFlight.current) return
    const request = new AbortController(); controller.current = request
    inFlight.current = true; setBusy(true); setError('')
    try {
      const value = await api<ExamResult>(`/api/exams/${encodeURIComponent(attempt.id)}/submit`, { ...jsonPost({ answers }), signal: request.signal })
      if (request.signal.aborted) return
      setResult(value); setAttempt(null); history.reload()
    } catch (reason) { if (!request.signal.aborted) setError(errorText(reason)) }
    finally { if (!request.signal.aborted) { inFlight.current = false; setBusy(false) } }
  }, [attempt, answers, history.reload])
  useEffect(() => {
    if (!attempt) return
    function tick() {
      if (!attempt) return
      const seconds = Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0 && expiredSubmit.current !== attempt.id) { expiredSubmit.current = attempt.id; void submit() }
    }
    tick(); const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [attempt, submit])
  useEffect(() => {
    if (!attempt) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [attempt])
  return <LearningPage title="Luyện đề JLPT">{isLoading ? <p role="status">Đang kiểm tra tài khoản…</p> : !user ? <p className="notice"><Link href="/login" className="underline">Đăng nhập</Link> để bắt đầu và lưu kết quả.</p> : <><p className="notice">Thời hạn do máy chủ quyết định. Hết giờ sẽ tự gửi đáp án; nếu mất mạng, dùng nút gửi lại. Rời trang sẽ mất đáp án chưa gửi.</p>{error && <p role="alert" className="notice">{error}</p>}{!attempt && <div className="flex flex-wrap gap-4"><LevelSelect value={level} onChange={setLevel} /><button className="btn btn-primary" disabled={busy} onClick={start}>{busy ? 'Đang bắt đầu…' : 'Bắt đầu lượt luyện mới'}</button></div>}{attempt && <section className="panel space-y-6 p-5"><h2 className="text-xl font-bold">{attempt.level} · Còn {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</h2><p>Đã chọn {Object.keys(answers).length}/{attempt.questions.length} câu</p>{attempt.questions.length === 0 && <p>Máy chủ chưa cung cấp câu hỏi.</p>}{attempt.questions.map((question, index) => <fieldset key={question.id} className="space-y-2" disabled={busy || remaining === 0}><legend className="font-semibold">{index + 1}. {question.prompt} ({question.skill})</legend>{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-start gap-2"><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: optionIndex }))} />{option}</label>)}</fieldset>)}<button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Đang gửi…' : remaining === 0 ? 'Gửi lại đáp án' : 'Nộp bài'}</button></section>}{result && <Result result={result} />}<section className="space-y-3"><h2 className="text-xl font-bold">Lịch sử từ tài khoản</h2><ResourceStatus {...history} empty={Boolean(history.data && !history.data.exams.length)} retry={history.reload} />{history.data?.exams.map(exam => <details className="panel p-4" key={exam.id}><summary>{exam.level} · {new Date(exam.createdAt).toLocaleString('vi-VN')} · {exam.score}/{exam.total}</summary><Result result={exam} /></details>)}</section></>}</LearningPage>
}
