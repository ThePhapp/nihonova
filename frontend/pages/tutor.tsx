import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/utils/api'
import { errorText, jsonPost, LearningPage, Level, LevelSelect, ResourceStatus, useResource } from '@/components/learning/shared'

type Status = { available: boolean; provider: string; reason?: string }
type Message = { role: 'user' | 'assistant'; content: string }
type Reply = { reply: string; provider: string; notice: string }
export default function TutorPage() {
  const { user, isLoading } = useAuth()
  const status = useResource<Status>('/api/ai/status')
  const [level, setLevel] = useState<Level>('N5')
  const [vietnamese, setVietnamese] = useState(true)
  const [includeHistory, setIncludeHistory] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [notice, setNotice] = useState('')
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const sending = useRef(false)
  useEffect(() => {
    controller.current?.abort(); sending.current = false
    setMessages([]); setMessage(''); setError(''); setNotice(''); setProvider(''); setBusy(false); setIncludeHistory(false)
    return () => controller.current?.abort()
  }, [user?.id])
  async function send() {
    const content = message.trim()
    if (!user || !status.data?.available || !content || sending.current) return
    const request = new AbortController(); controller.current = request
    sending.current = true; setBusy(true); setError('')
    try {
      const history = includeHistory ? messages.slice(-6).map(value => ({ role: value.role, content: value.content.slice(0, 1000) })) : []
      const reply = await api<Reply>('/api/ai/tutor', { ...jsonPost({ message: content, level, explainVietnamese: vietnamese, history }), signal: request.signal })
      if (request.signal.aborted) return
      if (!reply.reply?.trim()) throw new Error('Nhà cung cấp chưa trả nội dung. Vui lòng thử lại.')
      setMessages(previous => [...previous, { role: 'user' as const, content }, { role: 'assistant' as const, content: reply.reply }].slice(-12))
      setProvider(reply.provider); setNotice(reply.notice); setMessage('')
    } catch (reason) { if (!request.signal.aborted) { setError(errorText(reason)); status.reload() } }
    finally { if (!request.signal.aborted) { sending.current = false; setBusy(false) } }
  }
  return <LearningPage title="Gia sư AI"><p className="notice">AI có thể sai về nghĩa, ngữ pháp hoặc cách dùng. Hãy đối chiếu tài liệu đáng tin cậy. Tránh gửi thông tin cá nhân nhạy cảm.</p><ResourceStatus {...status} retry={status.reload} />{status.data && <section className="panel space-y-2 p-4"><h2 className="font-semibold">Nhà cung cấp: {status.data.provider}</h2><p>{status.data.available ? 'Dịch vụ đã được cấu hình.' : `Gia sư đang tắt: ${status.data.reason || 'Chưa có cấu hình nhà cung cấp khả dụng.'}`}</p><button className="btn" onClick={status.reload}>Kiểm tra lại trạng thái</button></section>}{isLoading ? <p role="status">Đang kiểm tra tài khoản…</p> : !user && <p className="notice"><Link className="underline" href="/login">Đăng nhập</Link> để gửi câu hỏi.</p>}<section className="panel space-y-4 p-5"><div className="flex flex-wrap gap-4"><LevelSelect value={level} onChange={setLevel} /><label><input type="checkbox" checked={vietnamese} onChange={event => setVietnamese(event.target.checked)} /> Giải thích bằng tiếng Việt</label><label><input type="checkbox" checked={includeHistory} onChange={event => setIncludeHistory(event.target.checked)} /> Cho phép gửi ngữ cảnh hội thoại</label></div><p className="muted">Hội thoại chỉ hiển thị trong phiên trang này. Khi cho phép ngữ cảnh, gửi tối đa 6 lượt trước, tối đa 1.000 ký tự mỗi lượt. Không lưu hội thoại vào tài khoản.</p><div className="space-y-4" aria-label="Hội thoại">{!messages.length && <p className="muted">Chưa có hội thoại. Bạn có thể hỏi về một câu tiếng Nhật hoặc cách dùng ngữ pháp.</p>}{messages.map((value, index) => <div key={index} className="rounded border p-4"><p className="font-semibold">{value.role === 'user' ? 'Bạn' : 'Gia sư AI'}</p><p className="whitespace-pre-wrap break-words">{value.content}</p></div>)}</div>{provider && <p className="muted">Phản hồi từ {provider}</p>}{notice && <p className="notice">{notice}</p>}<form className="space-y-3" onSubmit={event => { event.preventDefault(); void send() }}><label htmlFor="tutor-message" className="block font-semibold">Câu hỏi</label><textarea id="tutor-message" className="field w-full" rows={4} maxLength={1000} disabled={busy} value={message} onChange={event => setMessage(event.target.value)} placeholder="Nhập câu hỏi về tiếng Nhật…" /><p className="muted">{message.length}/1.000 ký tự</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" disabled={busy || !user || isLoading || !status.data?.available || status.loading || !message.trim()}>{busy ? 'Đang chờ phản hồi…' : 'Gửi câu hỏi'}</button><button type="button" className="btn" disabled={busy || !messages.length} onClick={() => { setMessages([]); setNotice(''); setProvider('') }}>Xóa hội thoại trong phiên</button></div></form>{busy && <p role="status">Đang chờ nhà cung cấp…</p>}{error && <p role="alert" className="notice">{error}</p>}</section></LearningPage>
}
