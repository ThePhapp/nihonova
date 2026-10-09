import Link from 'next/link'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/utils/api'

export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type Source = { name: string; url?: string; license: string }
export type Activity = { kind: string; itemId: string; minutes: number; completed: boolean; createdAt: string }
export type ExamResult = { id: string; level: Level; score: number; total: number; bySkill: Record<string, { correct: number; total: number }>; createdAt: string; answers: { questionId: string; answer: number; correctAnswer: number; correct: boolean; explanation: string }[] }
export type LearningState = { activities: Activity[]; exams: ExamResult[] }
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối. Vui lòng thử lại.'
export const jsonPost = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function useResource<T>(path: string | null, identity = '') {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(''); setLoading(Boolean(path))
    if (path) api<T>(path, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(errorText(reason))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, revision, identity])
  const reload = useCallback(() => setRevision(value => value + 1), [])
  return { data, loading, error, reload }
}

export function LearningPage({ title, children }: { title: string; children: ReactNode }) {
  return <Layout><div className="space-y-6 px-4 py-6 text-gray-900 dark:text-gray-100"><h1 className="page-heading text-3xl font-bold">{title}</h1><p className="muted">Bộ nội dung khởi đầu giới hạn, không phải giáo trình JLPT đầy đủ hay đề thi chính thức.</p>{children}</div></Layout>
}
export function LevelSelect({ value, onChange }: { value: Level; onChange: (value: Level) => void }) {
  return <label className="flex items-center gap-3">Cấp độ<select className="field" value={value} onChange={event => onChange(event.target.value as Level)}>{(['N5', 'N4', 'N3', 'N2', 'N1'] as Level[]).map(level => <option key={level}>{level}</option>)}</select></label>
}
export function ResourceStatus({ loading, error, empty, retry }: { loading: boolean; error: string; empty?: boolean; retry: () => void }) {
  if (loading) return <p role="status">Đang tải…</p>
  if (error) return <div role="alert" className="notice">{error} <button className="btn" onClick={retry}>Thử lại</button></div>
  if (empty) return <p className="notice">Chưa có nội dung cho lựa chọn này.</p>
  return null
}
export function Attribution({ source }: { source: Source }) {
  return <p className="muted text-sm">Nguồn: {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.name}</a> : source.name} · {source.license}</p>
}

export function ProgressButton({ kind, itemId }: { kind: 'kanji' | 'grammar' | 'reading' | 'listening'; itemId: string }) {
  const { user, isLoading } = useAuth()
  const state = useResource<LearningState>(user ? '/api/me/state' : null, user?.id)
  const [started] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    setSaved(false); setError(''); setSaving(false)
    return () => request.current?.abort()
  }, [user?.id])
  const completed = saved || Boolean(state.data?.activities.some(activity => activity.kind === kind && activity.itemId === itemId && activity.completed))
  async function save() {
    if (request.current && !request.current.signal.aborted && saving) return
    const controller = new AbortController(); request.current = controller
    setSaving(true); setError('')
    try {
      await api<{ success: true }>('/api/me/activity', { ...jsonPost({ kind, itemId, completed: true, minutes: Math.min(180, Math.max(0, Math.floor((Date.now() - started) / 60000))) }), signal: controller.signal })
      if (!controller.signal.aborted) setSaved(true)
    } catch (reason) { if (!controller.signal.aborted) setError(errorText(reason)) } finally { if (!controller.signal.aborted) setSaving(false) }
  }
  if (isLoading) return <p role="status">Đang kiểm tra tài khoản…</p>
  if (!user) return <p className="notice"><Link href="/login" className="underline">Đăng nhập</Link> để lưu tiến độ.</p>
  return <div className="space-y-2"><ResourceStatus loading={state.loading} error={state.error} retry={state.reload} /><button className="btn btn-primary" disabled={saving || completed || state.loading || Boolean(state.error)} onClick={save}>{completed ? 'Đã hoàn thành (đã lưu)' : saving ? 'Đang lưu…' : 'Đánh dấu hoàn thành'}</button>{error && <p role="alert">{error}</p>}</div>
}

export function ChoiceExercise({ prompt, options, answer, explanation, onCorrect }: { prompt: string; options: string[]; answer: number; explanation: string; onCorrect?: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  return <fieldset className="space-y-3"><legend className="font-semibold">{prompt}</legend>{options.map((option, index) => <label key={index} className="flex items-start gap-2"><input type="radio" checked={chosen === index} disabled={checked} onChange={() => setChosen(index)} />{option}</label>)}<button className="btn" disabled={chosen === null || checked} onClick={() => { setChecked(true); if (chosen === answer) onCorrect?.() }}>Kiểm tra bài luyện</button>{checked && <div role="status" className="notice"><p>{chosen === answer ? 'Đúng.' : `Chưa đúng. Đáp án: ${options[answer]}`}</p><p>{explanation}</p><button className="btn" onClick={() => { setChecked(false); setChosen(null) }}>Làm lại</button></div>}</fieldset>
}
