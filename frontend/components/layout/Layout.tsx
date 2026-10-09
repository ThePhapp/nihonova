import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from './Navbar'
import { useAuth } from '../../contexts/AuthContext'
const routes = [
  ['/dashboard', 'Tổng quan'], ['/dictionary', 'Từ điển'], ['/study', 'Ôn tập'],
  ['/kanji', 'Kanji'], ['/grammar', 'Ngữ pháp'], ['/jlpt', 'Luyện JLPT'],
  ['/reading', 'Đọc hiểu'], ['/listening', 'Nghe hiểu'], ['/tutor', 'Trợ lý'], ['/settings', 'Cài đặt'],
]
export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { sessionError, restoreSession } = useAuth()
  const [open, setOpen] = useState(false)
  const navigation = routes.map(([href, label]) => <Link key={href} href={href}
    aria-current={router.pathname === href ? 'page' : undefined}
    className={router.pathname === href ? 'nav-link nav-active' : 'nav-link'} onClick={() => setOpen(false)}>{label}</Link>)
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <Navbar />
    <div className="app-body">
      <aside className="app-sidebar">
        <button type="button" className="btn w-full md:hidden" aria-expanded={open} aria-controls="app-nav" onClick={() => setOpen(!open)}>Danh mục học tập {open ? '−' : '+'}</button>
        <nav id="app-nav" aria-label="Học tiếng Nhật" className={open ? 'nav-list flex' : 'nav-list hidden md:flex'}>{navigation}</nav>
      </aside>
      <main id="main-content" className="app-main" tabIndex={-1}>
        {sessionError && <div className="notice mb-4" role="status">{sessionError} <button type="button" className="btn" onClick={() => void restoreSession()}>Kiểm tra lại phiên</button></div>}
        {children}
      </main>
    </div>
  </div>
}
