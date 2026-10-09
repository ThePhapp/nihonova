import { ReactNode } from 'react'
import Layout from './Layout'
import ProtectedRoute from '../auth/ProtectedRoute'
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <Layout><ProtectedRoute>{children}</ProtectedRoute></Layout>
}
