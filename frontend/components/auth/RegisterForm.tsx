import AuthForm from './AuthForm'
export default function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  return <AuthForm mode="register" onSuccess={onSuccess} />
}
