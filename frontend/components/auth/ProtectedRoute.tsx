import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
export default function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading, sessionError, restoreSession } = useAuth()
  const router = useRouter()
  if (isLoading) return <p role="status" className="notice">Đang kiểm tra phiên đăng nhập…</p>
  if (!user) return <section className="panel space-y-4">
    <h1 className="page-heading">Đăng nhập để lưu việc học</h1>
    <p className="muted">{sessionError || 'Thẻ ôn tập, lịch sử và tiến độ được lưu theo tài khoản.'}</p>
    <Link className="btn btn-primary" href={{ pathname: '/login', query: { redirect: router.asPath } }}>Đăng nhập</Link>
    {sessionError && <button className="btn ml-2" type="button" onClick={() => void restoreSession()}>Thử lại</button>}
  </section>
  if (adminOnly && !user.isAdmin) return <p className="notice" role="alert">Bạn không có quyền truy cập trang này.</p>
  return <>{children}</>
}
