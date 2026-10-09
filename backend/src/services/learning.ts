import { pool } from '../config/db'
import { boolean, integer, level, object, text, HttpError } from './validation'
export interface Preferences { level: string; targetLevel: string; dailyMinutes: number; furigana: boolean; romaji: boolean }
export interface DictionaryEntry {
  id: string; word: string; reading: string; romaji: string; meanings: string[]; partOfSpeech: string;
  level: string | null; topic: string; meaningLanguage?: 'vi' | 'en'; examples: Array<{ japanese: string; vietnamese: string }>;
  source: { name: string; license: string; url?: string }; conjugations?: Record<string, string>; related?: string[]
}
export interface CardRow {
  id: string; entry: DictionaryEntry; due_at: Date; interval: string | number; ease: string | number;
  repetitions: number; last_reviewed: Date | null
}
export interface Card {
  id: string; entry: DictionaryEntry; dueAt: string; interval: number; ease: number;
  repetitions: number; lastReviewed: string | null
}
export interface Activity { kind: string; itemId: string; minutes: number; completed: boolean; createdAt: string }
export interface ExamResult {
  id: string; level: string; score: number; total: number; bySkill: Record<string, { correct: number; total: number }>;
  createdAt: string; answers: Array<{ questionId: string; answer: number; correctAnswer: number; correct: boolean; explanation: string }>
}
export const defaultPreferences: Preferences = { level: 'N5', targetLevel: 'N4', dailyMinutes: 20, furigana: true, romaji: false }
export function preferences(value: unknown): Preferences {
  const body = object(value)
  return { level: level(body.level), targetLevel: level(body.targetLevel), dailyMinutes: integer(body.dailyMinutes, 5, 180), furigana: boolean(body.furigana), romaji: boolean(body.romaji) }
}
function strings(value: unknown, count: number, max: number, min = 0): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > count) throw new HttpError(400, 'Invalid list')
  return value.map(item => text(item, max))
}
export function entry(value: unknown): DictionaryEntry {
  const body = object(value), source = object(body.source)
  if (!Array.isArray(body.examples) || body.examples.length > 10) throw new HttpError(400, 'Invalid examples')
  const result: DictionaryEntry = {
    id: text(body.id, 150), word: text(body.word, 200), reading: text(body.reading, 200, true),
    romaji: text(body.romaji, 200, true), meanings: strings(body.meanings, 24, 512, 1),
    partOfSpeech: text(body.partOfSpeech, 500, true), level: body.level === null ? null : level(body.level), topic: text(body.topic, 100, true),
    examples: body.examples.map(value => { const item = object(value); return { japanese: text(item.japanese, 1000), vietnamese: text(item.vietnamese, 1000) } }),
    source: { name: text(source.name, 200), license: text(source.license, 200) }
  }
  if (body.meaningLanguage !== undefined) {
    if (body.meaningLanguage !== 'vi' && body.meaningLanguage !== 'en') throw new HttpError(400, 'Invalid meaning language')
    result.meaningLanguage = body.meaningLanguage
  }
  if (source.url !== undefined) {
    const url = text(source.url, 1000)
    try { if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error() } catch { throw new HttpError(400, 'Invalid source URL') }
    result.source.url = url
  }
  if (body.related !== undefined) result.related = strings(body.related, 20, 150)
  if (body.conjugations !== undefined) {
    const values = object(body.conjugations)
    if (Object.keys(values).length > 30) throw new HttpError(400, 'Too many conjugations')
    result.conjugations = Object.fromEntries(Object.entries(values).map(([key, value]) => [text(key, 100), text(value, 300)]))
  }
  if (Buffer.byteLength(JSON.stringify(result)) > 16000) throw new HttpError(400, 'Entry too large')
  return result
}
export function card(row: CardRow): Card {
  return { id: row.id, entry: row.entry, dueAt: row.due_at.toISOString(), interval: Number(row.interval), ease: Number(row.ease), repetitions: row.repetitions, lastReviewed: row.last_reviewed?.toISOString() || null }
}
export function localDay(value: Date | string, timezone = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh'): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find(value => value.type === type)!.value
  return part('year') + '-' + part('month') + '-' + part('day')
}
export function statistics(cards: Card[], activities: Activity[], exams: ExamResult[], now = new Date()) {
  const today = localDay(now)
  const days = new Set(activities.filter(a => a.minutes > 0 || a.completed || a.kind === 'review').map(a => localDay(a.createdAt)))
  for (const c of cards) if (c.lastReviewed) days.add(localDay(c.lastReviewed))
  for (const exam of exams) days.add(localDay(exam.createdAt))
  let cursor = new Date(today + 'T00:00:00.000Z'), streak = 0
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (days.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
  const total = exams.reduce((sum, exam) => sum + exam.total, 0)
  const correct = exams.reduce((sum, exam) => sum + exam.score, 0)
  return {
    cards: cards.length, due: cards.filter(c => Date.parse(c.dueAt) <= now.getTime()).length,
    mastered: cards.filter(c => c.repetitions >= 3 && c.interval >= 21).length, streak,
    minutesToday: activities.filter(a => localDay(a.createdAt) === today).reduce((sum, a) => sum + a.minutes, 0),
    accuracy: total ? Math.round(correct / total * 100) : 0
  }
}
export async function learningState(userId: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const profiles = await client.query<{ preferences: Preferences }>('SELECT preferences FROM learning_profiles WHERE user_id=$1', [userId])
    const saved = await client.query<CardRow>('SELECT * FROM learning_cards WHERE user_id=$1 ORDER BY due_at,id', [userId])
    const history = await client.query<{ query: string }>('SELECT query FROM learning_history WHERE user_id=$1 ORDER BY created_at DESC,query LIMIT 50', [userId])
    const activity = await client.query<{ kind: string; item_id: string; minutes: number; completed: boolean; created_at: Date }>('SELECT kind,item_id,minutes,completed,created_at FROM learning_activity WHERE user_id=$1 ORDER BY created_at DESC,id DESC', [userId])
    const attempts = await client.query<{ result: ExamResult }>('SELECT result FROM exam_attempts WHERE user_id=$1 AND result IS NOT NULL ORDER BY started_at DESC,id', [userId])
    await client.query('COMMIT')
    const cards = saved.rows.map(card)
    const activities = activity.rows.map(a => ({ kind: a.kind, itemId: a.item_id, minutes: a.minutes, completed: a.completed, createdAt: a.created_at.toISOString() }))
    const exams = attempts.rows.map(a => a.result)
    return { preferences: profiles.rows[0]?.preferences || defaultPreferences, cards, history: history.rows.map(h => h.query), activities, exams, stats: statistics(cards, activities, exams) }
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
