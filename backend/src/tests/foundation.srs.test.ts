import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleReview, reviewInput } from '../services/srs'
import { localDay, statistics, Card, Activity } from '../services/learning'
import { HttpError } from '../services/validation'
const now = new Date('2026-10-09T10:00:00Z')
const fresh = { due_at: now, interval: 0, ease: 2.5, repetitions: 0 }
test('Again resets progress and schedules a ten-minute relearning step', () => {
  const result = scheduleReview({ ...fresh, repetitions: 7, interval: 60 }, 0, now)
  assert.equal(result.repetitions, 0)
  assert.equal(result.ease, 2.3)
  assert.equal(result.dueAt.getTime() - now.getTime(), 600000)
})
test('Good recall expands intervals; Hard does not increment mastery', () => {
  const first = scheduleReview(fresh, 2, now)
  assert.equal(first.interval, 1)
  const second = scheduleReview({ due_at: first.dueAt, interval: first.interval, ease: first.ease, repetitions: first.repetitions }, 2, first.dueAt)
  assert.equal(second.interval, 6)
  const third = scheduleReview({ due_at: second.dueAt, interval: second.interval, ease: second.ease, repetitions: second.repetitions }, 2, second.dueAt)
  assert.equal(third.interval, 15)
  assert.equal(third.repetitions, 3)
  const hard = scheduleReview({ ...fresh, interval: 15, repetitions: 3 }, 1, now)
  assert.equal(hard.repetitions, 3)
  assert.equal(hard.interval, 18)
  assert.equal(hard.ease, 2.35)
  assert.equal(scheduleReview(fresh, 3, now).interval, 4)
})
test('due boundary, bad ratings and schedule bounds', () => {
  assert.throws(() => scheduleReview({ ...fresh, due_at: new Date(now.getTime() + 1) }, 2, now), (error: unknown) => error instanceof HttpError && error.status === 409)
  assert.equal(scheduleReview(fresh, 2, now).lastReviewed, now)
  for (const rating of [-1, 4, 1.5, NaN]) assert.throws(() => scheduleReview(fresh, rating, now), HttpError)
  assert.equal(scheduleReview({ ...fresh, ease: 1.3 }, 0, now).ease, 1.3)
  const capped = scheduleReview({ ...fresh, interval: 365, ease: 3, repetitions: 10 }, 3, now)
  assert.equal(capped.ease, 3)
  assert.equal(capped.interval, 365)
})
test('review timestamp is validated but never controls scheduling', () => {
  assert.equal(reviewInput({ rating: 2, reviewedAt: '2099-01-01T00:00:00.000Z' }), 2)
  for (const reviewedAt of ['bad', '2026-02-30T00:00:00Z', 42]) assert.throws(() => reviewInput({ rating: 2, reviewedAt }), HttpError)
})
test('local rollover and immutable review events retain historical streak without study minutes', () => {
  const priorTimezone = process.env.APP_TIMEZONE
  delete process.env.APP_TIMEZONE
  try {
    assert.equal(localDay('2026-10-08T17:00:00Z'), '2026-10-09')
    assert.equal(localDay('2026-10-08T16:59:59Z'), '2026-10-08')
    assert.equal(localDay('2026-10-08T17:00:00Z', 'UTC'), '2026-10-08')
    const activities: Activity[] = [
      { kind: 'review', itemId: 'card', minutes: 0, completed: false, createdAt: '2026-10-07T17:01:00Z' },
      { kind: 'review', itemId: 'card', minutes: 0, completed: false, createdAt: '2026-10-08T17:01:00Z' },
      { kind: 'review', itemId: 'card', minutes: 0, completed: false, createdAt: '2026-10-09T17:01:00Z' },
      { kind: 'grammar', itemId: 'x', minutes: 5, completed: true, createdAt: '2026-10-09T17:02:00Z' }
    ]
    const cards: Card[] = [{ id: 'card', entry: { id: 'x', word: '猫', reading: 'ねこ', romaji: 'neko', meanings: ['mèo'], partOfSpeech: 'noun', level: 'N5', topic: '', examples: [], source: { name: 'original', license: 'original' } }, dueAt: '2026-10-11T00:00:00Z', interval: 1, ease: 2.5, repetitions: 1, lastReviewed: '2026-10-09T17:01:00Z' }]
    assert.equal(statistics(cards, activities, [], new Date('2026-10-09T17:03:00Z')).streak, 3)
    assert.equal(statistics(cards, activities, [], new Date('2026-10-09T17:03:00Z')).minutesToday, 5)
    assert.equal(statistics([], activities.slice(0, 3), [], new Date('2026-10-09T17:03:00Z')).minutesToday, 0)
  } finally { if (priorTimezone !== undefined) process.env.APP_TIMEZONE = priorTimezone }
})
