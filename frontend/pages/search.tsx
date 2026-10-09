import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../components/layout/Layout'
import { DictionaryResponse } from '../types/learning'
import { ContentKind, ContentSummary } from '../types/content'
import { contentSummaries, matchesContent } from '../utils/content'
import { api, errorMessage } from '../utils/api'
interface SearchItem { id: string; title: string; subtitle: string; href: string; license: string; source: string; sourceUrl?: string }
interface Group { name: string; items: SearchItem[]; error?: string }
const kinds: ContentKind[] = ['kanji', 'grammar', 'reading']
const labels: Record<string, string> = { kanji: 'Kanji', grammar: 'Ngữ pháp', reading: 'Đọc hiểu' }
function contentLink(item: ContentSummary): string {
  const params = new URLSearchParams({ level: item.level, item: item.id })
  if (item.kind === 'grammar') params.set('q', item.title)
  return `/${item.kind}?${params}`
}
export default function SearchPage() {
  const router = useRouter()
  const query = typeof router.query.q === 'string' ? router.query.q.trim().slice(0, 100) : ''
  const [draft, setDraft] = useState(query)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => setDraft(query), [query])
  useEffect(() => {
    if (!router.isReady || !query) { setGroups([]); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setGroups([])
    const tasks: Array<Promise<SearchItem[]>> = [
      api<DictionaryResponse>(`/api/dictionary?provider=local&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(response => response.entries.map(entry => ({
          id: entry.id, title: entry.word, subtitle: [entry.reading, entry.meanings.join('; ')].filter(Boolean).join(' · '),
          href: `/dictionary?q=${encodeURIComponent(entry.word)}`, source: entry.source.name, sourceUrl: entry.source.url, license: entry.source.license
        }))),
      ...kinds.map(kind => contentSummaries(kind, controller.signal).then(items => items.filter(item => matchesContent(item, query)).map(item => ({
        id: item.id, title: item.title, subtitle: item.level, href: contentLink(item), source: item.source.name, sourceUrl: item.source.url, license: item.source.license
      })))),
    ]
    void Promise.allSettled(tasks).then(results => {
      if (controller.signal.aborted) return
      const names = ['Từ điển Nhật–Việt', ...kinds.map(kind => labels[kind])]
      setGroups(results.map((result, i) => result.status === 'fulfilled' ? { name: names[i], items: result.value } :
        { name: names[i], items: [], error: errorMessage(result.reason) }))
      setLoading(false)
    })
    return () => controller.abort()
  }, [query, router.isReady, retry])
  function submit(event: FormEvent) {
    event.preventDefault()
    void router.push({ pathname: '/search', query: draft.trim() ? { q: draft.trim() } : {} })
  }
  const count = groups.reduce((sum, group) => sum + group.items.length, 0)
  return <Layout><div className="space-y-6">
    <div><h1 className="page-heading">Tìm kiếm toàn ứng dụng</h1><p className="muted mt-2">Tìm trong từ điển Nhật–Việt và bộ bài học khởi đầu có phạm vi giới hạn.</p></div>
    <form role="search" aria-label="Từ khóa tìm kiếm nội dung" className="panel space-y-3" onSubmit={submit}>
      <label htmlFor="search-query">Từ khóa</label><div className="flex gap-2"><input id="search-query" className="field" maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Chữ Nhật, cách đọc hoặc nghĩa" />
        <button type="submit" className="btn btn-primary">Tìm kiếm</button></div>
    </form>
    {!query ? <p className="notice">Nhập từ khóa để tìm từ, Kanji, ngữ pháp và bài đọc.</p> :
      loading ? <p className="notice" role="status">Đang tìm “{query}”…</p> : <>
        <p role="status" className="muted">{count} kết quả cho “{query}”.</p>
        {groups.some(group => group.error) && <button className="btn" type="button" onClick={() => setRetry(value => value + 1)}>Thử tải lại nhóm bị lỗi</button>}
        {groups.map(group => <section key={group.name} className="panel space-y-4"><h2 className="text-lg font-semibold">{group.name} <span className="muted font-normal">({group.items.length})</span></h2>
          {group.error ? <p role="alert">Không tải được nhóm này: {group.error}</p> :
            !group.items.length ? <p className="muted">Không có kết quả trong bộ nội dung hiện tại.</p> :
              <ul className="space-y-4">{group.items.map(item => <li key={item.id} className="space-y-1">
                <Link className="text-link text-base font-medium" href={item.href}>{item.title}</Link><p className="muted">{item.subtitle}</p>
                <p className="muted text-xs">Nguồn: {item.sourceUrl && /^https?:\/\//.test(item.sourceUrl) ?
                  <a className="text-link" href={item.sourceUrl} rel="noreferrer" target="_blank">{item.source}</a> : item.source} · {item.license}</p>
              </li>)}</ul>}
        </section>)}
      </>}
  </div></Layout>
}
