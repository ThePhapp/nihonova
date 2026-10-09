import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Attribution, ChoiceExercise, LearningPage, Level, LevelSelect, ProgressButton, ResourceStatus, Source, useResource } from '@/components/learning/shared'

type Reading = { id: string; title: string; level: Level; segments: { text: string; reading?: string; meaning?: string }[]; translation: string; questions: { prompt: string; options: string[]; answer: number; explanation: string }[]; source: Source }
type Entry = { id: string; word: string; reading: string; meanings: string[]; source: Source }
function Reader({ item }: { item: Reading }) {
  const [ruby, setRuby] = useState(true)
  const [fontSize, setFontSize] = useState(24)
  const [query, setQuery] = useState('')
  const [lookup, setLookup] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const dictionary = useResource<{ entries: Entry[]; source: string; limited: boolean }>(lookup ? `/api/dictionary?q=${encodeURIComponent(lookup)}` : null)
  function selectedLookup() {
    const selected = window.getSelection()?.toString().trim() ?? ''
    if (!selected || selected.length > 100) { setSelectionError('Hãy bôi đen từ hoặc cụm từ (tối đa 100 ký tự).'); return }
    setSelectionError(''); setQuery(selected); setLookup(selected)
  }
  return <article className="panel space-y-5 p-5"><h2 className="text-2xl font-bold">{item.title}</h2><div className="flex flex-wrap items-center gap-4"><label><input type="checkbox" checked={ruby} onChange={event => setRuby(event.target.checked)} /> Hiện furigana</label><label className="flex items-center gap-2">Cỡ chữ <input type="range" min={18} max={36} value={fontSize} onChange={event => setFontSize(Number(event.target.value))} />{fontSize}px</label></div><div lang="ja" className="whitespace-pre-wrap leading-loose" style={{ fontSize }}>{item.segments.map((segment, index) => ruby && segment.reading ? <ruby key={index}>{segment.text}<rp>(</rp><rt>{segment.reading}</rt><rp>)</rp></ruby> : <span key={index}>{segment.text}</span>)}</div><div className="space-y-3"><button className="btn" onClick={selectedLookup}>Tra phần văn bản đang chọn</button>{selectionError && <p role="alert">{selectionError}</p>}<form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setLookup(query.trim()); if (query.trim() === lookup) dictionary.reload() }}><label className="sr-only" htmlFor="reader-lookup">Từ cần tra</label><input id="reader-lookup" className="field" lang="ja" maxLength={100} placeholder="Nhập từ tiếng Nhật" value={query} onChange={event => setQuery(event.target.value)} /><button className="btn" disabled={!query.trim()}>Tra từ</button></form>{lookup && <aside className="panel space-y-3 p-4" aria-label="Kết quả từ điển"><h3 className="font-semibold">Tra: {lookup}</h3><ResourceStatus {...dictionary} empty={Boolean(dictionary.data && !dictionary.data.entries.length)} retry={dictionary.reload} />{dictionary.data && <p className="muted">{dictionary.data.source}{dictionary.data.limited ? ' · Bộ từ giới hạn' : ''}</p>}{dictionary.data?.entries.map(entry => <div key={entry.id}><p lang="ja" className="font-semibold">{entry.word}【{entry.reading}】</p><p>{entry.meanings.join('; ')}</p><Attribution source={entry.source} /></div>)}</aside>}</div><details><summary className="cursor-pointer font-semibold">Bản dịch tiếng Việt do tác giả nội dung biên soạn</summary><p className="whitespace-pre-wrap">{item.translation}</p></details><h3 className="font-semibold">Câu hỏi đọc hiểu</h3>{item.questions.length ? item.questions.map((question, index) => <ChoiceExercise key={index} {...question} />) : <p>Chưa có câu hỏi cho bài này.</p>}<ProgressButton kind="reading" itemId={item.id} /><Attribution source={item.source} /></article>
}
export default function ReadingPage() {
  const router = useRouter()
  const routeLevel = typeof router.query.level === 'string' && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(router.query.level) ? router.query.level as Level : 'N5'
  const routeItem = typeof router.query.item === 'string' && router.query.item.length <= 200 ? router.query.item : ''
  const [routeReady, setRouteReady] = useState(false)
  const [level, setLevel] = useState<Level>('N5')
  const [selected, setSelected] = useState('')
  useEffect(() => {
    if (!router.isReady) return
    setLevel(routeLevel)
    setSelected(routeItem)
    setRouteReady(true)
  }, [router.isReady, routeLevel, routeItem])
  const resource = useResource<{ items: Reading[] }>(routeReady && router.isReady ? `/api/content/reading?level=${level}` : null)
  const items = resource.data?.items ?? []
  const item = items.find(value => value.id === selected) ?? items[0]
  return <LearningPage title="Luyện đọc"><LevelSelect value={level} onChange={value => { setLevel(value); setSelected('') }} /><ResourceStatus {...resource} empty={!items.length} retry={resource.reload} />{item && <div className="grid gap-6 lg:grid-cols-[240px_1fr]"><nav className="panel space-y-2 p-4 self-start" aria-label="Bài đọc">{items.map(value => <button className="btn block w-full text-left" key={value.id} aria-pressed={value.id === item.id} onClick={() => setSelected(value.id)}>{value.title}</button>)}</nav><Reader key={item.id} item={item} /></div>}</LearningPage>
}
