import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { credentials, HttpError, integer, password } from '../services/validation'
import { entry, preferences, statistics } from '../services/learning'
import { verifySession } from '../middleware/auth'
export const sampleEntry = { id: 'original-cat', word: '猫', reading: 'ねこ', romaji: 'neko', meanings: ['mèo'], partOfSpeech: 'noun', level: 'N5', topic: 'animals', examples: [], source: { name: 'Original starter', license: 'Original' } }
test('credentials normalize email and enforce UTF-8 bcrypt bounds', () => {
  assert.equal(credentials({ email: '  STUDENT@EXAMPLE.COM ', password: 'abcdefgh' }).email, 'student@example.com')
  for (const password of ['short', '猫'.repeat(25), 12345]) assert.throws(() => credentials({ email: 'a@example.com', password }), HttpError)
  assert.throws(() => credentials({ email: 'invalid', password: 'abcdefgh' }), HttpError)
  assert.equal(credentials({ email: 'a@example.com', password: '猫'.repeat(24) }).password.length, 24)
  assert.equal(password('abcdefgh'), 'abcdefgh')
})
test('snapshot validation keeps known fields and rejects malformed nested values', () => {
  assert.deepEqual(entry({ ...sampleEntry, userId: 42 }), sampleEntry)
  assert.equal(entry({ ...sampleEntry, level: null, topic: '', meaningLanguage: 'en' }).meaningLanguage, 'en')
  for (const changes of [{ level: 'N0' }, { meanings: [] }, { source: { name: 'x', license: 'x', url: 'javascript:alert(1)' } }, { examples: [null] }, { related: new Array(21).fill('x') }]) assert.throws(() => entry({ ...sampleEntry, ...changes }), HttpError)
  assert.throws(() => preferences({ level: 'N5', targetLevel: 'N4', dailyMinutes: 181, furigana: true, romaji: false }), HttpError)
  assert.throws(() => integer(NaN, 0, 180), HttpError)
})
test('online dictionary snapshots accept provider bounds without inventing metadata', () => {
  const online = { ...sampleEntry, word: 'a'.repeat(200), reading: '', romaji: '',
    meanings: Array.from({ length: 24 }, (_, i) => `meaning ${i}`), partOfSpeech: '',
    level: null, topic: '', meaningLanguage: 'en' }
  assert.equal(entry(online).meanings.length, 24)
  assert.equal(entry(online).partOfSpeech, '')
  assert.equal(entry({ ...online, meanings: ['x'.repeat(512)] }).meanings[0].length, 512)
  for (const changes of [{ word: 'x'.repeat(201) }, { meanings: new Array(25).fill('x') },
    { meanings: ['x'.repeat(513)] }, { partOfSpeech: 'x'.repeat(501) }]) {
    assert.throws(() => entry({ ...online, ...changes }), HttpError)
  }
  assert.throws(() => entry({ ...online, meanings: new Array(24).fill('猫'.repeat(512)) }), HttpError)
})
test('JWT rejects unsupported algorithms, missing expiry and malformed identity', () => {
  const before = process.env.JWT_SECRET
  process.env.JWT_SECRET = 'foundation-tests-only-secret-at-least-32-bytes'
  try {
    const secret = process.env.JWT_SECRET
    assert.deepEqual(verifySession(jwt.sign({ id: '1', email: 'a@example.com' }, secret, { expiresIn: '1h' })), { id: '1', email: 'a@example.com', sessionVersion: 0 })
    for (const token of [
      jwt.sign({ id: '1', email: 'a@example.com' }, secret, { algorithm: 'HS384', expiresIn: '1h' }),
      jwt.sign({ id: '1', email: 'a@example.com' }, secret),
      jwt.sign({ id: 1, email: 'a@example.com' }, secret, { expiresIn: '1h' }),
      jwt.sign({ id: '1 OR 1=1', email: 'a@example.com' }, secret, { expiresIn: '1h' }),
      jwt.sign({ id: '1', email: 'a@example.com' }, secret, { expiresIn: -1 })
    ]) assert.throws(() => verifySession(token))
    delete process.env.JWT_SECRET
    assert.throws(() => verifySession('token'), (error: unknown) => error instanceof HttpError && error.status === 503)
  } finally { if (before === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = before }
})
test('statistics are derived from real activity and exam question counts', () => {
  const now = new Date('2026-10-09T12:00:00Z')
  const activities = [
    { kind: 'grammar', itemId: 'x', minutes: 5, completed: true, createdAt: '2026-10-09T10:00:00Z' },
    { kind: 'reading', itemId: 'y', minutes: 7, completed: true, createdAt: '2026-10-08T10:00:00Z' }
  ]
  const exams = [{ id: 'exam', level: 'N5', score: 2, total: 3, bySkill: {}, createdAt: '2026-10-08T11:00:00Z', answers: [] }]
  assert.deepEqual(statistics([], activities, exams, now), { cards: 0, due: 0, mastered: 0, streak: 2, minutesToday: 5, accuracy: 67 })
  assert.equal(statistics([], [], [], now).accuracy, 0)
})
