import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LearningState } from '../types/learning'
import { api, errorMessage } from '../utils/api'
export function useLearningState() {
  const { user, isLoading } = useAuth()
  const [data, setData] = useState<LearningState | null>(null)
  const [owner, setOwner] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++request.current
    if (!user) { setData(null); setOwner(null); setLoading(false); setError(''); return }
    setLoading(true); setError('')
    try {
      const response = await api<LearningState>('/api/me/state')
      if (current === request.current) { setData(response); setOwner(user.id) }
    } catch (failure) { if (current === request.current) setError(errorMessage(failure)) }
    finally { if (current === request.current) setLoading(false) }
  }, [user])
  useEffect(() => {
    setData(null); setOwner(null)
    if (!isLoading) void refresh()
    return () => { request.current++ }
  }, [refresh, isLoading])
  return { data: owner === user?.id ? data : null, loading: loading || isLoading, error, refresh }
}
