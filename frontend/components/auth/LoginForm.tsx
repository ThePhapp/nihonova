import AuthForm from './AuthForm'
export default function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  return <AuthForm mode="login" onSuccess={onSuccess} />
}
