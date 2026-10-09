import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Attribution, LearningPage, Level, LevelSelect, ProgressButton, ResourceStatus, Source, useResource } from '@/components/learning/shared'

type Grammar = { id: string; title: string; structure: string; explanation: string; level: Level; examples: { japanese: string; reading?: string; vietnamese: string }[]; source: Source }
function Practice({ example }: { example: Grammar['examples'][number] }) {
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(false)
  const normalize = (value: string) => value.normalize('NFKC').replace(/[\s。！？!?]/g, '')
  return <div className="space-y-2"><p>Luyện tự viết câu tiếng Nhật từ nghĩa: {example.vietnamese}</p><label className="block">Câu của bạn<input lang="ja" className="field w-full" maxLength={500} value={text} onChange={event => { setText(event.target.value); setChecked(false) }} /></label><button className="btn" disabled={!text.trim()} onClick={() => setChecked(true)}>Đối chiếu với ví dụ</button>{checked && <p role="status">{normalize(text) === normalize(example.japanese) ? 'Khớp câu mẫu.' : 'Khác câu mẫu; có thể có cách diễn đạt khác đúng.'} Câu mẫu: <span lang="ja">{example.japanese}</span></p>}</div>
}
export default function GrammarPage() {
  const router = useRouter()
  const routeLevel = typeof router.query.level === 'string' && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(router.query.level) ? router.query.level as Level : 'N5'
  const routeItem = typeof router.query.item === 'string' && router.query.item.length <= 200 ? router.query.item : ''
  const routeQuery = typeof router.query.q === 'string' && router.query.q.length <= 100 ? router.query.q.trim() : ''
  const [routeReady, setRouteReady] = useState(false)
  const [level, setLevel] = useState<Level>('N5')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  useEffect(() => {
    if (!router.isReady) return
    setLevel(routeLevel)
    setSelected(routeItem)
    setQuery(routeQuery)
    setSearch(routeQuery)
    setRouteReady(true)
  }, [router.isReady, routeLevel, routeItem, routeQuery])
  const resource = useResource<{ items: Grammar[] }>(routeReady && router.isReady ? `/api/content/grammar?level=${level}&q=${encodeURIComponent(search)}` : null)
  const items = resource.data?.items ?? []
  const item = items.find(value => value.id === selected) ?? items[0]
  return <LearningPage title="Ngữ pháp"><div className="flex flex-wrap gap-4"><LevelSelect value={level} onChange={value => { setLevel(value); setSelected('') }} /><form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setSelected('') }}><label className="sr-only" htmlFor="grammar-search">Tìm ngữ pháp</label><input id="grammar-search" className="field" placeholder="Tìm cấu trúc, ý nghĩa" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} /><button className="btn">Tìm</button></form></div><ResourceStatus {...resource} empty={!items.length} retry={resource.reload} />{item && <div className="grid gap-6 md:grid-cols-[240px_1fr]"><nav className="panel space-y-2 p-4" aria-label="Bài ngữ pháp">{items.map(value => <button className="btn block w-full text-left" aria-pressed={value.id === item.id} key={value.id} onClick={() => setSelected(value.id)}>{value.title}</button>)}</nav><article key={item.id} className="panel space-y-5 p-5"><h2 className="text-2xl font-bold" lang="ja">{item.title}</h2><p className="badge">{item.level}</p><p lang="ja">Cấu trúc: {item.structure}</p><p>{item.explanation}</p><h3 className="font-semibold">Ví dụ</h3>{item.examples.map((example, index) => <div key={index}><p lang="ja">{example.japanese}</p>{example.reading && <p lang="ja" className="muted">{example.reading}</p>}<p>{example.vietnamese}</p></div>)}<h3 className="font-semibold">Luyện viết từ ví dụ</h3><p className="muted">Đối chiếu câu mẫu tại chỗ, không phải bộ chấm ngữ pháp tự động.</p>{item.examples.length ? <Practice example={item.examples[0]} /> : <p>Chưa có ví dụ để luyện.</p>}<ProgressButton kind="grammar" itemId={item.id} /><Attribution source={item.source} /></article></div>}</LearningPage>
}
