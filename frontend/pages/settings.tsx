import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ProtectedLayout from '../components/layout/ProtectedLayout'
import { useLearningState } from '../hooks/useLearningState'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Level, levels, Preferences } from '../types/learning'
import { api, errorMessage } from '../utils/api'
function Settings() {
  const { data, loading, error, refresh } = useLearningState()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [minutes, setMinutes] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const initialized = useRef(false)
  const saving = useRef(false)
  useEffect(() => {
    if (data && !initialized.current) { setPreferences(data.preferences); setMinutes(String(data.preferences.dailyMinutes)); initialized.current = true }
  }, [data])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!preferences || saving.current) return
    const dailyMinutes = Number(minutes)
    if (!Number.isInteger(dailyMinutes) || dailyMinutes < 5 || dailyMinutes > 180) { setMessage('Thời gian học cần là số nguyên từ 5 đến 180 phút.'); return }
    saving.current = true; setBusy(true); setMessage('')
    try {
      const response = await api<Preferences>('/api/me/preferences', { method: 'PUT', body: JSON.stringify({ ...preferences, dailyMinutes }) })
      setPreferences(response); setMinutes(String(response.dailyMinutes)); setMessage('Đã lưu mục tiêu và tùy chọn trên tài khoản.')
      await refresh()
    } catch (failure) { setMessage(errorMessage(failure)) }
    finally { saving.current = false; setBusy(false) }
  }
  if (loading && !preferences) return <p className="notice" role="status">Đang tải tùy chọn…</p>
  if (!preferences) return <div className="notice" role="alert">{error || 'Chưa tải được tùy chọn.'} <button className="btn" type="button" onClick={() => void refresh()}>Thử lại</button></div>
  return <div className="max-w-3xl space-y-6">
    <div><h1 className="page-heading">Mục tiêu và cài đặt</h1><p className="muted mt-2 break-all">{user?.email}</p></div>
    {error && <p className="notice" role="alert">{error}</p>}
    <form className="panel space-y-5" onSubmit={save} aria-busy={busy}>
      <h2 className="text-lg font-semibold">Kế hoạch mỗi ngày</h2>
      <fieldset className="space-y-4" disabled={busy}>
        <div><label htmlFor="settings-level">Trình độ hiện tại (tự chọn)</label>
          <select id="settings-level" className="field mt-1" value={preferences.level} onChange={e => setPreferences({ ...preferences, level: e.target.value as Level })}>{levels.map(value => <option key={value}>{value}</option>)}</select></div>
        <p className="muted">Chưa chắc nên chọn mức nào? <Link className="text-link" href="/jlpt">Làm bài luyện khởi đầu</Link>, rồi xem kỹ năng trong <Link className="text-link" href="/dashboard">Tổng quan</Link>. Bộ câu hỏi giới hạn không thay thế bài kiểm tra xếp lớp chuẩn hóa.</p>
        <div><label htmlFor="settings-target">Cấp độ mục tiêu</label>
          <select id="settings-target" className="field mt-1" value={preferences.targetLevel} onChange={e => setPreferences({ ...preferences, targetLevel: e.target.value as Level })}>{levels.map(value => <option key={value}>{value}</option>)}</select></div>
        <div><label htmlFor="settings-minutes">Mục tiêu phút mỗi ngày</label>
          <input id="settings-minutes" className="field mt-1" type="number" required min={5} max={180} step={1} value={minutes} onChange={e => setMinutes(e.target.value)} /><p className="muted mt-1">Từ 5 đến 180 phút.</p></div>
        <h2 className="text-lg font-semibold">Hỗ trợ đọc trong từ điển và ôn tập</h2>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" checked={preferences.furigana} onChange={e => setPreferences({ ...preferences, furigana: e.target.checked })} />Hiện furigana (cách đọc trên chữ Nhật)</label>
        <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" checked={preferences.romaji} onChange={e => setPreferences({ ...preferences, romaji: e.target.checked })} />Hiện romaji khi nguồn có dữ liệu</label>
      </fieldset>
      {message && <p className="notice" role="status">{message}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu tùy chọn'}</button>
    </form>
    <section className="panel space-y-4"><h2 className="text-lg font-semibold">Giao diện trên thiết bị này</h2><p className="muted">Đang dùng chế độ {theme === 'dark' ? 'tối' : 'sáng'}.</p>
      <button type="button" className="btn" onClick={toggleTheme}>{theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}</button>
    </section>
  </div>
}
export default function SettingsPage() {
  const { user } = useAuth()
  return <ProtectedLayout><Settings key={user?.id || 'guest'} /></ProtectedLayout>
}
