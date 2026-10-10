const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')

// Refuse to run integration writes against any user/production database.
const testUrl = process.env.TEST_DATABASE_URL || 'postgresql://jlpt_test:local_test_only@127.0.0.1:5440/jlpt_test'
const parsed = new URL(testUrl)
if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || parsed.pathname !== '/jlpt_test') {
  throw new Error('Integration tests require a local database named jlpt_test')
}
process.env.DATABASE_URL = testUrl
process.env.JWT_SECRET = 'integration-test-only-secret-at-least-32-characters'
process.env.NODE_ENV = 'test'
const exported = require('../backend/dist/app')
const app = exported.app || exported.default || exported.createApp?.()
const { pool } = require('../backend/dist/config/db')
let server, base, owner, stranger, entry, card
const email = `integration-${Date.now()}@example.test`

async function request(path, body, token, method) {
  const response = await fetch(`${base}/api${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}

before(async () => {
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve))
  await pool.end()
})

test('account → lookup → card → SRS → exam → restored account', async t => {
  await t.test('reject invalid registration and unauthenticated state', async () => {
    assert.equal((await request('/auth/register', { email: 'invalid', password: 'short' })).status, 400)
    assert.equal((await request('/me/state')).status, 401)
  })
  await t.test('register, reject duplicates, login and verify normalized identity', async () => {
    assert.equal((await request('/auth/register', { email, password: 'Study-safe-2026!' })).status, 201)
    assert.ok([400, 409].includes((await request('/auth/register', { email, password: 'Study-safe-2026!' })).status))
    assert.equal((await request('/auth/login', { email, password: 'wrong-password' })).status, 401)
    const login = await request('/auth/login', { email: email.toUpperCase(), password: 'Study-safe-2026!' })
    assert.equal(login.status, 200)
    owner = login.data.token
    const me = await request('/auth/me', undefined, owner)
    assert.equal(me.data.email, email)
    const otherEmail = `other-${email}`
    assert.equal((await request('/auth/register', { email: otherEmail, password: 'Study-safe-2026!' })).status, 201)
    stranger = (await request('/auth/login', { email: otherEmail, password: 'Study-safe-2026!' })).data.token
  })
  await t.test('lookup real starter content with provenance and bounded query', async () => {
    const found = await request('/dictionary?q=' + encodeURIComponent('水'))
    assert.equal(found.status, 200)
    assert.ok(found.data.entries.length > 0)
    entry = found.data.entries[0]
    assert.ok(entry.reading && entry.meanings.length && entry.source.name)
    assert.equal((await request('/dictionary?q=' + 'a'.repeat(101))).status, 400)
    assert.equal((await request('/dictionary?level=INVALID')).status, 400)
  })
  await t.test('save idempotent card and prevent cross-account review', async () => {
    const saved = await request('/me/cards', { entry }, owner)
    assert.ok([200, 201].includes(saved.status))
    await request('/me/cards', { entry }, owner)
    let state = (await request('/me/state', undefined, owner)).data
    assert.equal(state.cards.length, 1)
    card = state.cards[0]
    assert.ok([403, 404].includes((await request(`/me/cards/${card.id}/review`, { rating: 3 }, stranger)).status))
    assert.equal((await request(`/me/cards/${card.id}/review`, { rating: 8 }, owner)).status, 400)
    assert.equal((await request(`/me/cards/${card.id}/review`, { rating: 2 }, owner)).status, 200)
    assert.equal((await request(`/me/cards/${card.id}/review`, { rating: 2 }, owner)).status, 409)
    state = (await request('/me/state', undefined, owner)).data
    assert.equal(state.cards.length, 1)
    assert.ok(Date.parse(state.cards[0].dueAt) > Date.now())
    assert.equal((await request('/me/state', undefined, stranger)).data.cards.length, 0)
  })
  await t.test('preferences and learning progress validate and persist', async () => {
    assert.equal((await request('/me/preferences', { dailyMinutes: 10000 }, owner, 'PUT')).status, 400)
    const preferences = { level: 'N5', targetLevel: 'N4', dailyMinutes: 25, furigana: true, romaji: false }
    assert.equal((await request('/me/preferences', preferences, owner, 'PUT')).status, 200)
    assert.ok([200, 201].includes((await request('/me/activity', { kind: 'reading', itemId: 'integration-reading', minutes: 5, completed: true }, owner)).status))
    assert.equal((await request('/me/activity', { kind: 'reading', itemId: 'x', minutes: -10, completed: true }, owner)).status, 400)
    assert.ok([200, 201].includes((await request('/me/history', { query: '猫' }, owner)).status))
    const state = (await request('/me/state', undefined, owner)).data
    assert.equal(state.preferences.dailyMinutes, 25)
    assert.ok(state.history.includes('猫'))
    assert.ok(state.stats.minutesToday >= 5)
  })
  await t.test('exam hides keys, enforces ownership and grades once on server', async () => {
    const started = await request('/exams/start', { level: 'N5' }, owner)
    assert.equal(started.status, 200)
    assert.ok(started.data.questions.length)
    for (const question of started.data.questions) {
      assert.equal(question.answer, undefined)
      assert.equal(question.correctAnswer, undefined)
      assert.equal(question.explanation, undefined)
    }
    const path = `/exams/${started.data.id}/submit`
    assert.ok([403, 404].includes((await request(path, { answers: {} }, stranger)).status))
    assert.equal((await request(path, { answers: { unknown: 0 } }, owner)).status, 400)
    const answers = Object.fromEntries(started.data.questions.map(q => [q.id, 0]))
    assert.equal((await request(`/exams/${started.data.id}/answers`, { answers }, owner, 'PUT')).status, 200)
    const active = await request('/exams/active', undefined, owner)
    assert.equal(active.status, 200)
    assert.equal(active.data.attempt.id, started.data.id)
    assert.deepEqual(active.data.attempt.savedAnswers, answers)
    assert.ok(active.data.attempt.questions.every(question => question.answer === undefined && question.explanation === undefined))
    assert.equal((await request('/exams/start', { level: 'N4' }, owner)).data.id, started.data.id)
    assert.equal((await request('/exams/active', undefined, stranger)).data.attempt, null)
    const graded = await request(path, { answers }, owner)
    assert.equal(graded.status, 200)
    assert.equal(graded.data.total, started.data.questions.length)
    assert.equal(graded.data.score, graded.data.answers.filter(a => a.correct).length)
    assert.deepEqual((await request(path, { answers }, owner)).data, graded.data)
    const state = (await request('/me/state', undefined, owner)).data
    assert.equal(state.exams.length, 1)
  })
  await t.test('new login restores cards, preferences and exam history', async () => {
    const fresh = await request('/auth/login', { email, password: 'Study-safe-2026!' })
    const restored = await request('/me/state', undefined, fresh.data.token)
    assert.equal(restored.status, 200)
    assert.equal(restored.data.cards.length, 1)
    assert.equal(restored.data.exams.length, 1)
    assert.equal(restored.data.preferences.targetLevel, 'N4')
  })
  await t.test('deadline grades saved answers, never accepts late replacement', async () => {
    const started = (await request('/exams/start', { level: 'N4' }, owner)).data
    const answers = Object.fromEntries(started.questions.map(q => [q.id, 0]))
    const savePath = `/exams/${started.id}/answers`
    assert.ok([403, 404].includes((await request(savePath, { answers }, stranger, 'PUT')).status))
    assert.equal((await request(savePath, { answers }, owner, 'PUT')).status, 200)
    await pool.query("UPDATE exam_attempts SET expires_at = now() - interval '1 second' WHERE id = $1", [started.id])
    assert.ok([409, 410].includes((await request(savePath, { answers: {} }, owner, 'PUT')).status))
    const late = await request(`/exams/${started.id}/submit`, { answers: {} }, owner)
    assert.equal(late.status, 200)
    assert.ok(late.data.answers.every(answer => answer.answer === 0))
  })
  await t.test('provider unavailable is explicit; invalid JSON is a client error', async () => {
    const status = await request('/ai/status')
    assert.equal(status.status, 200)
    if (!status.data.available) assert.equal((await request('/ai/tutor', { message: 'こんにちは', level: 'N5', explainVietnamese: true }, owner)).status, 503)
    const malformed = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })
    assert.equal(malformed.status, 400)
    assert.equal((await request('/nonexistent')).status, 404)
  })
})
