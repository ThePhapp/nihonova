import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
export default function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  return <header className="app-header">
    <Link href="/" className="font-semibold text-lg">JLPT Study</Link>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>{theme === 'dark' ? 'Sáng' : 'Tối'}</button>
      {!isLoading && (user ? <button className="btn" type="button" onClick={logout}>Đăng xuất</button> : <Link className="btn" href="/login">Đăng nhập</Link>)}
    </div>
  </header>
}
