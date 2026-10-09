import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../components/layout/Layout'
import { useAuth } from '../contexts/AuthContext'
import LoginForm from '../components/auth/LoginForm'
export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const redirect = router.query.redirect
  const destination = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\') && !redirect.startsWith('/login') && !redirect.startsWith('/register') ? redirect : '/dashboard'
  useEffect(() => { if (user) void router.replace(destination) }, [user, router, destination])
  return <Layout><section className="mx-auto max-w-md space-y-6 py-8">
    <h1 className="page-heading">Đăng nhập</h1>
    <p className="muted">Lưu thẻ ôn tập và theo dõi việc học trên tài khoản của bạn.</p>
    {router.query.registered === '1' && <p className="notice" role="status">Đã tạo tài khoản. Bạn có thể đăng nhập.</p>}
    <LoginForm onSuccess={() => void router.replace(destination)} />
    <p>Chưa có tài khoản? <Link className="text-link" href="/register">Đăng ký</Link></p>
  </section></Layout>
}
