import { pool } from '../config/db'
import { card, CardRow } from './learning'
import { HttpError, integer, object, text } from './validation'

export interface Schedule { dueAt: Date; interval: number; ease: number; repetitions: number; lastReviewed: Date }
export function reviewInput(value: unknown): number {
  const body = object(value)
  const rating = integer(body.rating, 0, 3)
  if (body.reviewedAt !== undefined) {
    const timestamp = text(body.reviewedAt, 40)
    if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new HttpError(400, 'Invalid review timestamp')
    const date = timestamp.slice(0, 10)
    if (new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new HttpError(400, 'Invalid review timestamp')
  }
  return rating
}
export function scheduleReview(previous: Pick<CardRow, 'due_at' | 'interval' | 'ease' | 'repetitions'>, rating: number, now: Date): Schedule {
  integer(rating, 0, 3)
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(previous.due_at.getTime())) throw new HttpError(400, 'Invalid review time')
  if (previous.due_at.getTime() > now.getTime()) throw new HttpError(409, 'Card is not due', 'CARD_NOT_DUE')
  const previousInterval = Number(previous.interval), previousEase = Number(previous.ease)
  if (!Number.isFinite(previousInterval) || previousInterval < 0 || !Number.isFinite(previousEase) || previousEase < 1.3 || !Number.isInteger(previous.repetitions) || previous.repetitions < 0) throw new HttpError(503, 'Invalid stored schedule')
  let repetitions = previous.repetitions, interval: number, ease = previousEase
  // Intervals are days; Again is a ten-minute relearning step.
  if (rating === 0) { repetitions = 0; interval = 10 / 1440; ease -= 0.2 }
  else if (rating === 1) { interval = Math.max(1, Math.round(previousInterval * 1.2)); ease -= 0.15 }
  else {
    repetitions++
    interval = repetitions === 1 ? (rating === 3 ? 4 : 1) : repetitions === 2 ? (rating === 3 ? 8 : 6) : Math.max(1, Math.round(previousInterval * previousEase * (rating === 3 ? 1.3 : 1)))
    if (rating === 3) ease += 0.15
  }
  interval = Math.min(interval, 365)
  ease = Math.round(Math.min(3, Math.max(1.3, ease)) * 100) / 100
  return { dueAt: new Date(now.getTime() + interval * 86400000), interval, ease, repetitions, lastReviewed: now }
}
export async function reviewCard(userId: string, id: string, rating: number) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const saved = await client.query<CardRow>('SELECT * FROM learning_cards WHERE id=$1 AND user_id=$2 FOR UPDATE', [id, userId])
    if (!saved.rows[0]) throw new HttpError(404, 'Card not found')
    // Read the clock after acquiring the lock; queued duplicate requests see the new due time.
    const clock = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')
    const scheduled = scheduleReview(saved.rows[0], rating, clock.rows[0].now)
    const updated = await client.query<CardRow>('UPDATE learning_cards SET due_at=$3,interval=$4,ease=$5,repetitions=$6,last_reviewed=$7 WHERE id=$1 AND user_id=$2 RETURNING *', [id, userId, scheduled.dueAt, scheduled.interval, scheduled.ease, scheduled.repetitions, scheduled.lastReviewed])
    await client.query("INSERT INTO learning_activity(user_id,kind,item_id,minutes,completed,created_at) VALUES($1,'review',$2,0,false,$3)", [userId, id, scheduled.lastReviewed])
    await client.query('COMMIT')
    return card(updated.rows[0])
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
