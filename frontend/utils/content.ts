import { api } from './api'
import { ContentKind, ContentSummary, GrammarItem, KanjiItem, ListeningItem, ReadingItem } from '../types/content'
export async function contentSummaries(kind: ContentKind, signal?: AbortSignal): Promise<ContentSummary[]> {
  const options = { signal }
  if (kind === 'kanji') {
    const { items } = await api<{ items: KanjiItem[] }>('/api/content/kanji', options)
    return items.map(item => ({ id: item.id, kind, title: item.character, level: item.level, source: item.source,
      searchText: [item.character, item.meaning, ...item.onyomi, ...item.kunyomi].join(' ') }))
  }
  if (kind === 'grammar') {
    const { items } = await api<{ items: GrammarItem[] }>('/api/content/grammar', options)
    return items.map(item => ({ id: item.id, kind, title: item.title, level: item.level, source: item.source,
      searchText: [item.title, item.structure, item.explanation].join(' ') }))
  }
  if (kind === 'reading') {
    const { items } = await api<{ items: ReadingItem[] }>('/api/content/reading', options)
    return items.map(item => ({ id: item.id, kind, title: item.title, level: item.level, source: item.source,
      searchText: [item.title, item.translation, ...item.segments.map(segment => [segment.text, segment.reading, segment.meaning].filter(Boolean).join(' '))].join(' ') }))
  }
  const { items } = await api<{ items: ListeningItem[] }>('/api/content/listening', options)
  return items.map(item => ({ id: item.id, kind, title: item.title, level: item.level, source: item.source, searchText: [item.title, item.transcript, item.translation].join(' ') }))
}
export function matchesContent(item: ContentSummary, query: string): boolean {
  const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase()
  return normalized(item.searchText).includes(normalized(query.trim()))
}
