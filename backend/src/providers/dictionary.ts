import { DictionaryEntry, Level, words, coverageNotice, isLevel } from '../content'

export class InputError extends Error {}
export interface DictionaryQuery { q?: string; level?: Level; topic?: string }
export interface DictionaryProvider {
  search(query: DictionaryQuery): { entries: DictionaryEntry[]; source: string; limited: boolean }
}
function hasControlCharacters(value: string): boolean {
  return Array.from(value).some(character => character.charCodeAt(0) <= 0x1f)
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[\s'’-]+/g, '').normalize('NFC')
}

export function parseQuery(query: Record<string, unknown>): DictionaryQuery {
  for (const key of ['q', 'level', 'topic']) {
    if (query[key] !== undefined && typeof query[key] !== 'string') throw new InputError('Tham số phải là chuỗi đơn.')
  }
  const q = (query.q as string | undefined) ?? ''
  const topic = query.topic as string | undefined
  const level = query.level as string | undefined
  if (q.length > 100 || hasControlCharacters(q)) throw new InputError('Từ tìm kiếm tối đa 100 ký tự, không chứa ký tự điều khiển.')
  if (topic !== undefined && (topic.length > 60 || hasControlCharacters(topic))) throw new InputError('Chủ đề không hợp lệ.')
  if (level !== undefined && !isLevel(level)) throw new InputError('Cấp độ phải từ N5 đến N1.')
  return { q: q.trim(), topic, level: level as Level | undefined }
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    previous = current
  }
  return previous[b.length]
}

export class LicensedLocalDictionaryProvider implements DictionaryProvider {
  search(query: DictionaryQuery) {
    // Also validate programmatic callers so no provider can bypass the public bounds.
    const validated = parseQuery({ q: query.q, level: query.level, topic: query.topic })
    const q = normalizeSearch(validated.q ?? '')
    const candidates = words.filter(entry => (!validated.level || entry.level === validated.level) &&
      (!validated.topic || normalizeSearch(entry.topic) === normalizeSearch(validated.topic)))
    const matched = candidates.filter(entry => !q || [entry.word, entry.reading, entry.romaji, ...entry.meanings].some(value => normalizeSearch(value).includes(q)))
    // Fuzzy fallback returns real entries, never invented definitions or upstream metadata.
    const suggested = q.length >= 3 && !matched.length ? candidates.map(entry => ({ entry, score: Math.min(...[entry.word, entry.reading, entry.romaji, ...entry.meanings].map(value => distance(q, normalizeSearch(value)))) }))
      .filter(item => item.score <= (q.length >= 6 ? 2 : 1)).sort((a, b) => a.score - b.score).slice(0, 5).map(item => item.entry) : []
    return { entries: (matched.length ? matched : suggested).slice(0, 100), source: coverageNotice, limited: true }
  }
}
