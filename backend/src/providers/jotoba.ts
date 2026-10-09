import { createHash } from 'crypto'
import { request } from 'https'
import { DictionaryEntry } from '../content'
import { DictionaryQuery, InputError, parseQuery } from './dictionary'

export class JotobaError extends Error {
  constructor(public status: 429 | 503, public code: string, message: string) { super(message) }
}
const unavailable = () => new JotobaError(503, 'JOTOBA_UNAVAILABLE', 'Jotoba tạm thời không khả dụng. Hãy dùng bộ từ local.')
export interface JotobaResponse { status: number; body: string }
export type JotobaHttp = (query: string) => Promise<JotobaResponse>
const MAX_BYTES = 262144

export function createJotobaHttp(send: typeof request = request): JotobaHttp {
  return query => new Promise((resolve, reject) => {
  let finished = false
  const complete = (value?: JotobaResponse) => {
    if (finished) return
    finished = true; clearTimeout(timer)
    if (value) resolve(value); else reject(unavailable())
  }
  const req = send('https://jotoba.de/api/search/words', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' } }, res => {
    if (res.statusCode !== 200) { complete({ status: res.statusCode ?? 503, body: '' }); res.destroy(); return }
    const chunks: Buffer[] = []
    let size = 0
    res.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BYTES) { complete(); res.destroy(); req.destroy() }
      else chunks.push(chunk)
    })
    res.on('end', () => complete({ status: 200, body: Buffer.concat(chunks).toString('utf8') }))
    res.on('error', () => complete()); res.on('aborted', () => complete())
  })
  const timer = setTimeout(() => { complete(); req.destroy() }, 3500)
  req.on('error', () => complete())
  req.end(JSON.stringify({ query, language: 'English', no_english: false }))
  })
}
export const jotobaHttp = createJotobaHttp()

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function bounded(value: unknown, max = 200): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max }
function strings(value: unknown, limit: number): value is string[] { return Array.isArray(value) && value.length <= limit && value.every(item => bounded(item, 512)) }

// Official docs list string POS values; the free live probe on 2026-10-09 returned tagged objects.
// Preserve upstream English labels for both forms; never infer Vietnamese meanings or JLPT levels.
function partOfSpeech(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 16) throw unavailable()
  const label = (item: unknown, depth: number): string => {
    if (depth > 3) throw unavailable()
    if (bounded(item, 100)) return item
    if (!record(item) || Object.keys(item).length !== 1) throw unavailable()
    const [key, detail] = Object.entries(item)[0]
    if (!bounded(key, 100)) throw unavailable()
    return detail === null ? key : `${key} (${label(detail, depth + 1)})`
  }
  return value.map(item => label(item, 0))
}

export function parseJotoba(body: string): DictionaryEntry[] {
  if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) throw unavailable()
  let data: unknown
  try { data = JSON.parse(body) } catch { throw unavailable() }
  if (!record(data) || !Array.isArray(data.words) || data.words.length > 100) throw unavailable()
  const entries: DictionaryEntry[] = []
  for (const word of data.words) {
    if (!record(word) || !record(word.reading) || !bounded(word.reading.kana) ||
      (word.reading.kanji !== undefined && word.reading.kanji !== null && word.reading.kanji !== '' && !bounded(word.reading.kanji)) ||
      !Array.isArray(word.senses) || word.senses.length > 100) throw unavailable()
    const meanings: string[] = []; const pos: string[] = []
    for (const sense of word.senses) {
      if (!record(sense) || typeof sense.language !== 'string' || !strings(sense.glosses, 100)) throw unavailable()
      if (sense.language !== 'English') continue
      meanings.push(...sense.glosses); pos.push(...partOfSpeech(sense.pos ?? []))
    }
    if (!meanings.length) continue
    const text = typeof word.reading.kanji === 'string' && word.reading.kanji ? word.reading.kanji : word.reading.kana
    const hash = createHash('sha256').update(JSON.stringify([text, word.reading.kana, meanings])).digest('hex').slice(0, 24)
    const entry: DictionaryEntry = { id: `jotoba-${hash}`, word: text, reading: word.reading.kana, romaji: '',
      meanings: [...new Set(meanings)].slice(0, 24), meaningLanguage: 'en', partOfSpeech: [...new Set(pos)].join('; ').slice(0, 500),
      level: null, topic: '', examples: [], source: { name: 'Jotoba · JMdict — Jim Breen / EDRDG (English glosses)',
        url: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
        license: 'CC BY-SA 4.0 — https://www.edrdg.org/edrdg/licence.html' } }
    // Keep snapshots below the foundation's 16 KiB cap, including room for the request wrapper.
    while (entry.meanings.length > 1 && Buffer.byteLength(JSON.stringify(entry), 'utf8') > 16000) entry.meanings.pop()
    if (Buffer.byteLength(JSON.stringify(entry), 'utf8') > 16000) throw unavailable()
    entries.push(entry)
  }
  return entries.slice(0, 50)
}

export class JotobaDictionaryProvider {
  private cache = new Map<string, { expires: number; entries: DictionaryEntry[] }>()
  private clients = new Map<string, { window: number; calls: number }>()
  private active = 0
  private window = 0
  private calls = 0
  constructor(private http: JotobaHttp = jotobaHttp, private now = Date.now,
    private backoff: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))) {}

  async search(query: DictionaryQuery, clientId: string) {
    const validated = parseQuery(query as unknown as Record<string, unknown>)
    if (validated.level || validated.topic) throw new InputError('Bộ lọc cấp độ/chủ đề chỉ áp dụng cho local.')
    if (!validated.q) throw new InputError('Jotoba cần từ tìm kiếm không rỗng.')
    const key = validated.q.normalize('NFKC')
    if (key.length > 100) throw new InputError('Từ tìm kiếm sau chuẩn hóa tối đa 100 ký tự.')
    const now = this.now()
    for (const [id, client] of this.clients) if (now - client.window >= 60000) this.clients.delete(id)
    for (const [q, item] of this.cache) if (item.expires <= now) this.cache.delete(q)
    const client = this.clients.get(clientId) ?? { window: now, calls: 0 }
    if (!this.clients.has(clientId) && this.clients.size >= 1000) throw unavailable()
    if (client.calls >= 10) throw new JotobaError(429, 'JOTOBA_RATE_LIMIT', 'Tối đa 10 tra cứu Jotoba mỗi phút.')
    client.calls++; this.clients.set(clientId, client)
    const cached = this.cache.get(key)
    if (cached) return this.result(cached.entries)
    if (this.active >= 2) throw new JotobaError(429, 'JOTOBA_RATE_LIMIT', 'Jotoba đang bận, hãy thử lại sau.')
    this.active++
    try {
      let response: JotobaResponse | undefined
      // One retry with 200 ms backoff for transient network/5xx errors; at most 7.2 seconds total.
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await this.backoff(200)
        if (this.now() - this.window >= 60000) { this.window = this.now(); this.calls = 0 }
        if (this.calls >= 30) throw new JotobaError(429, 'JOTOBA_RATE_LIMIT', 'Đã đạt giới hạn gọi Jotoba của máy chủ.')
        this.calls++
        try { response = await this.http(key) } catch { if (attempt === 1) throw unavailable(); continue }
        if (response.status < 500 || attempt === 1) break
      }
      if (response?.status === 429) throw new JotobaError(429, 'JOTOBA_RATE_LIMIT', 'Jotoba đang giới hạn tra cứu, hãy thử lại sau.')
      if (!response || response.status !== 200) throw unavailable()
      const entries = parseJotoba(response.body)
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value as string)
      this.cache.set(key, { entries, expires: this.now() + 60000 })
      return this.result(entries)
    } finally { this.active-- }
  }
  private result(entries: DictionaryEntry[]) {
    return { entries, source: 'Jotoba · JMdict/EDRDG · CC BY-SA 4.0. Nghĩa tiếng Anh; nguồn không cung cấp level/topic/romaji. Tối đa 50 kết quả, không phải giáo trình JLPT.', limited: true }
  }
}
