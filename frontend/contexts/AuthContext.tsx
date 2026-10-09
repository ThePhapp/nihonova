import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError, errorMessage, SESSION_EXPIRED, TOKEN_KEY } from '../utils/api'
interface User { id: string; email: string; isAdmin?: boolean }
interface AuthContextType {
  user: User | null; isLoading: boolean; sessionError: string
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void; restoreSession: () => Promise<void>
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const generation = useRef(0)
  const logout = useCallback(() => {
    generation.current++
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null); setSessionError(''); setIsLoading(false)
  }, [])
  const restoreSession = useCallback(async () => {
    const request = ++generation.current
    setSessionError('')
    if (!localStorage.getItem(TOKEN_KEY)) { setIsLoading(false); setUser(null); return }
    setIsLoading(true)
    try {
      const current = await api<User>('/api/auth/me')
      if (request === generation.current) setUser(current)
    } catch (error) {
      if (request === generation.current) {
        setUser(null)
        setSessionError(error instanceof ApiError && error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' : errorMessage(error))
      }
    } finally { if (request === generation.current) setIsLoading(false) }
  }, [])
  useEffect(() => {
    void restoreSession()
    const expire = () => { generation.current++; setUser(null); setIsLoading(false); setSessionError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.') }
    const sync = (event: StorageEvent) => { if (event.key === TOKEN_KEY) void restoreSession() }
    window.addEventListener(SESSION_EXPIRED, expire); window.addEventListener('storage', sync)
    return () => { generation.current++; window.removeEventListener(SESSION_EXPIRED, expire); window.removeEventListener('storage', sync) }
  }, [restoreSession])
  const login = async (email: string, password: string) => {
    const response = await api<{ success: true; token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (!response.token || !response.user?.id || !response.user?.email) throw new Error('Dữ liệu đăng nhập không hợp lệ.')
    localStorage.setItem(TOKEN_KEY, response.token)
    generation.current++; setUser(response.user); setSessionError(''); setIsLoading(false)
  }
  const register = async (email: string, password: string) => {
    await api<{ success: true }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  return <AuthContext.Provider value={{ user, login, register, logout, isLoading, sessionError, restoreSession }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
