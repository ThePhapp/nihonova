import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/utils/api'
import { errorText } from './shared'

export function useExamAnswers(attempt: { id: string; expiresAt: string } | null, answers: Record<string, number>) {
  const latest = useRef(answers)
  latest.current = answers
  const saved = useRef<Record<string, number> | null>(null)
  const pending = useRef<Promise<void> | null>(null)
  const controller = useRef<AbortController | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const identity = useRef(attempt?.id)
  identity.current = attempt?.id
  useEffect(() => {
    saved.current = null; pending.current = null; controller.current?.abort()
    setStatus('idle'); setError('')
    return () => controller.current?.abort()
  }, [attempt?.id])
  const flush = useCallback(async () => {
    if (!attempt) return
    // Serialize saves so an earlier response can never overwrite a newer snapshot.
    while (pending.current) await pending.current
    if (identity.current !== attempt.id || Date.now() >= Date.parse(attempt.expiresAt)) return
    if (saved.current === latest.current) return
    const snapshot = latest.current
    const request = new AbortController(); controller.current = request
    setStatus('saving'); setError('')
    const operation = api<unknown>(`/api/exams/${encodeURIComponent(attempt.id)}/answers`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: snapshot }), signal: request.signal,
    }).then(() => {
      if (!request.signal.aborted && identity.current === attempt.id) {
        saved.current = snapshot
        setStatus(snapshot === latest.current ? 'saved' : 'saving')
      }
    }).catch((reason: unknown) => {
      if (!request.signal.aborted && identity.current === attempt.id) { setStatus('error'); setError(errorText(reason)) }
      throw reason
    }).finally(() => { if (pending.current === operation) pending.current = null })
    pending.current = operation
    await operation
    if (saved.current !== latest.current && identity.current === attempt.id && Date.now() < Date.parse(attempt.expiresAt)) await flush()
  }, [attempt])
  useEffect(() => {
    if (!attempt || Object.keys(answers).length === 0) return
    setStatus('saving')
    const timer = window.setTimeout(() => { void flush().catch(() => undefined) }, 350)
    return () => window.clearTimeout(timer)
  }, [attempt, answers, flush])
  return { status, error, flush }
}
