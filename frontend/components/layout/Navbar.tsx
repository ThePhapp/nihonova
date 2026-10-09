import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
export default function Navbar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { user, logout, isLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  function search(event: FormEvent) {
    event.preventDefault()
    if (query.trim()) void router.push({ pathname: '/search', query: { q: query.trim() } })
  }
  return <header className="app-header">
    <Link href="/" className="font-semibold text-lg">JLPT Study</Link>
    <form className="order-last flex w-full min-w-0 gap-2 md:order-none md:w-auto md:max-w-md md:flex-1" role="search" aria-label="Tìm kiếm toàn ứng dụng" onSubmit={search}>
      <label htmlFor="global-search" className="sr-only">Tìm từ, Kanji, ngữ pháp, bài đọc</label>
      <input id="global-search" className="field" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm từ hoặc bài học…" />
      <button className="btn" type="submit" disabled={!query.trim()}>Tìm</button>
    </form>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>{theme === 'dark' ? 'Sáng' : 'Tối'}</button>
      {!isLoading && (user ? <button className="btn" type="button" onClick={logout}>Đăng xuất</button> : <Link className="btn" href="/login">Đăng nhập</Link>)}
    </div>
  </header>
}
