import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { useLearningState } from '../../hooks/useLearningState'
import { Card, DictionaryEntry, DictionaryResponse, levels } from '../../types/learning'
import { api, errorMessage } from '../../utils/api'
import EntryCard from './EntryCard'
export default function Dictionary() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: state, loading: stateLoading, error: stateError, refresh } = useLearningState()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [provider, setProvider] = useState('local')
  const [tab, setTab] = useState('search')
  const [result, setResult] = useState<DictionaryResponse | null>(null)
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const sequence = useRef(0)
  useEffect(() => {
    if (!router.isReady) return
    setQuery(typeof router.query.q === 'string' ? router.query.q.slice(0, 100) : '')
    setLevel(typeof router.query.level === 'string' && levels.includes(router.query.level as typeof levels[number]) ? router.query.level : '')
  }, [router.isReady, router.query.q, router.query.level])
  useEffect(() => {
    const current = ++sequence.current
    const controller = new AbortController()
    setLoading(true); setError(''); setResult(null); setSuggestions([])
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q: query.trim(), provider })
      if (provider === 'local') { if (level) params.set('level', level); if (topic.trim()) params.set('topic', topic.trim()) }
      try {
        const response = await api<DictionaryResponse>(`/api/dictionary?${params}`, { signal: controller.signal })
        if (current === sequence.current) { setResult(response); setSuggestions(response.entries.slice(0, 8)) }
      } catch (failure) { if (!controller.signal.aborted && current === sequence.current) setError(errorMessage(failure)) }
      finally { if (current === sequence.current) setLoading(false) }
    }, provider === 'jotoba' ? 700 : 300)
    return () => { clearTimeout(timer); controller.abort(); sequence.current++ }
  }, [query, level, topic, provider, retry])
  async function saveHistory(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    if (!user || !query.trim()) return
    try {
      await api('/api/me/history', { method: 'POST', body: JSON.stringify({ query: query.trim() }) })
      await refresh(); setNotice('Đã lưu từ khóa vào lịch sử.')
    } catch (failure) { setNotice(errorMessage(failure)) }
  }
  async function save(entry: DictionaryEntry) {
    if (busy) return
    setBusy(entry.id); setNotice('')
    try {
      await api<Card>('/api/me/cards', { method: 'POST', body: JSON.stringify({ entry }) })
      await refresh(); setNotice('Đã lưu thẻ ôn tập.')
    } catch (failure) { setNotice(errorMessage(failure)) }
    finally { setBusy(null) }
  }
  async function remove(card: Card) {
    if (busy) return
    setBusy(card.entry.id); setNotice('')
    try {
      await api(`/api/me/cards/${encodeURIComponent(card.id)}`, { method: 'DELETE' })
      await refresh(); setNotice('Đã gỡ thẻ khỏi bộ ôn tập.')
    } catch (failure) { setNotice(errorMessage(failure)) }
    finally { setBusy(null) }
  }
  const savedIds = new Set(state?.cards.map(card => card.entry.id) || [])
  return <div className="space-y-6">
    <div><h1 className="page-heading">Từ điển tiếng Nhật</h1><p className="muted mt-2">Tra chữ Nhật, cách đọc, romaji hoặc nghĩa. Kết quả tìm linh hoạt tùy nguồn cung cấp.</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Chế độ từ điển">
      {[['search','Tra từ'],['saved','Thẻ đã lưu'],['history','Lịch sử']].map(([value,label]) => <button type="button" className={tab === value ? 'btn btn-primary' : 'btn'} key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}
    </div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {tab === 'search' ? <>
      <form className="panel space-y-4" onSubmit={saveHistory}>
        <div><label htmlFor="dict-provider">Nguồn từ điển</label><select className="field mt-1" id="dict-provider" value={provider} onChange={e => setProvider(e.target.value)}>
          <option value="local">Bộ khởi đầu Nhật–Việt</option><option value="jotoba">Jotoba trực tuyến Nhật–Anh</option></select></div>
        <div><label htmlFor="dict-query">Từ khóa</label><div className="mt-1 flex gap-2">
          <input className="field" id="dict-query" list="dict-suggestions" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="日本 / にほん / nihon / Nhật Bản" />
          <button className="btn" type="submit">Tra từ</button></div>
          <datalist id="dict-suggestions">{suggestions.map(entry => <option key={entry.id} value={entry.word}>{entry.reading} · {entry.meanings.join('; ')}</option>)}</datalist>
        </div>
        {provider === 'local' ? <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="dict-level">Cấp độ</label><select id="dict-level" className="field mt-1" value={level} onChange={e => setLevel(e.target.value)}><option value="">Tất cả cấp độ</option>{levels.map(value => <option key={value}>{value}</option>)}</select></div>
          <div><label htmlFor="dict-topic">Chủ đề</label><input id="dict-topic" className="field mt-1" maxLength={100} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Lọc theo chủ đề" /></div>
        </div> : <p className="muted">Nghĩa tiếng Anh; nguồn này không cung cấp cấp JLPT hay chủ đề. Nhập từ khóa để tra trực tuyến.</p>}
      </form>
      {loading ? <p className="notice" role="status">Đang tra từ…</p> : error ? <div className="notice" role="alert"><p>{error}</p><button className="btn mt-2" onClick={() => setRetry(value => value + 1)} type="button">Thử lại</button></div> : <>
        {result && <p className="muted">{result.entries.length} kết quả · {result.source}{result.limited ? ' · Bộ dữ liệu giới hạn, không phải giáo trình JLPT đầy đủ.' : ''}</p>}
        {!result?.entries.length && <section className="panel space-y-3"><p>Không có kết quả phù hợp. Hãy thử cách đọc hoặc từ khóa khác.</p><button className="btn" type="button" onClick={() => { setQuery(''); setLevel(''); setTopic('') }}>Xóa tìm kiếm và bộ lọc</button></section>}
        {!user && <p className="muted"><Link className="text-link" href="/login?redirect=/dictionary">Đăng nhập</Link> để lưu thẻ và lịch sử.</p>}
        <div className="grid-cards">{result?.entries.map(entry => <EntryCard key={entry.id} entry={entry} furigana={state?.preferences.furigana ?? true} romaji={state?.preferences.romaji ?? false}
          saved={savedIds.has(entry.id)} busy={busy === entry.id} onSave={user ? () => void save(entry) : undefined} />)}</div>
      </>}
    </> : !user ? <p className="notice"><Link className="text-link" href="/login?redirect=/dictionary">Đăng nhập</Link> để xem {tab === 'saved' ? 'thẻ đã lưu' : 'lịch sử của bạn'}.</p> :
      stateLoading ? <p role="status" className="notice">Đang tải dữ liệu tài khoản…</p> :
      stateError ? <div role="alert" className="notice">{stateError} <button className="btn" type="button" onClick={() => void refresh()}>Thử lại</button></div> :
      tab === 'saved' ? <><Link className="text-link" href="/study">Ôn các thẻ đến hạn</Link>
        {!state?.cards.length && <p className="notice">Chưa có thẻ. Tra từ và chọn “Lưu thẻ ôn tập” để bắt đầu.</p>}
        <div className="grid-cards">{state?.cards.map(card => <EntryCard key={card.id} entry={card.entry} furigana={state.preferences.furigana} romaji={state.preferences.romaji}
          busy={busy === card.entry.id} onRemove={() => void remove(card)} />)}</div></> :
        <section className="panel space-y-3"><p className="muted">Lịch sử được lưu khi bạn bấm “Tra từ”.</p>
          {!state?.history.length && <p>Chưa có lịch sử tra từ.</p>}
          <ul className="space-y-2">{state?.history.map((word, i) => <li key={i}><button className="btn" type="button" onClick={() => { setQuery(word); setTab('search') }}>{word}</button></li>)}</ul></section>}
    {user && tab === 'search' && stateError && <p className="notice" role="alert">Chưa tải được thẻ đã lưu: {stateError} <button className="btn" type="button" onClick={() => void refresh()}>Tải lại</button></p>}
  </div>
}
