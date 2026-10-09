import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { errorMessage } from '../../utils/api'
export function AuthForm({ mode, onSuccess }: { mode: 'login' | 'register'; onSuccess?: () => void }) {
  const { login, register } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (mode === 'register' && password !== confirmation) { setError('Hai mật khẩu chưa khớp.'); return }
    const bytes = new TextEncoder().encode(password).length
    if (mode === 'register' && (bytes < 8 || bytes > 72)) { setError('Mật khẩu cần từ 8 đến 72 byte UTF-8.'); return }
    setBusy(true)
    try {
      await (mode === 'login' ? login(email, password) : register(email, password))
      if (onSuccess) onSuccess()
      else void router.push(mode === 'login' ? '/dashboard' : '/login?registered=1')
    } catch (failure) { setError(errorMessage(failure)) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <div><label htmlFor="auth-email">Email <span className="text-red-700 dark:text-red-300">*</span></label>
      <input id="auth-email" className="field mt-1" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
    <div><label htmlFor="auth-password">Mật khẩu <span className="text-red-700 dark:text-red-300">*</span></label>
      <input id="auth-password" className="field mt-1" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} />
      {mode === 'register' && <p className="muted mt-1">Từ 8 đến 72 byte UTF-8; ký tự có dấu có thể chiếm nhiều byte.</p>}</div>
    {mode === 'register' && <div><label htmlFor="auth-confirm">Nhập lại mật khẩu <span className="text-red-700 dark:text-red-300">*</span></label>
      <input id="auth-confirm" className="field mt-1" type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>}
    <div className="min-h-[1.5rem]" aria-live="polite">{error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}</div>
    <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
  </form>
}
export default AuthForm
