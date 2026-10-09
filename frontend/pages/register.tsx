import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../components/layout/Layout'
import { useAuth } from '../contexts/AuthContext'
import RegisterForm from '../components/auth/RegisterForm'
export default function RegisterPage() {
  const { user } = useAuth()
  const router = useRouter()
  useEffect(() => { if (user) void router.replace('/dashboard') }, [user, router])
  return <Layout><section className="mx-auto max-w-md space-y-6 py-8">
    <h1 className="page-heading">Tạo tài khoản</h1>
    <RegisterForm onSuccess={() => void router.push('/login?registered=1')} />
    <p>Đã có tài khoản? <Link className="text-link" href="/login">Đăng nhập</Link></p>
  </section></Layout>
}
