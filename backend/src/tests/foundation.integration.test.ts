import test from 'node:test'
import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { AddressInfo } from 'node:net'
const testDatabaseUrl = process.env.TEST_DATABASE_URL
test('isolated additive migration and authenticated account state', { skip: !testDatabaseUrl }, async () => {
  if (!testDatabaseUrl) return
  const schema = 'foundation_test_' + Date.now() + '_' + process.pid
  const admin = new Pool({ connectionString: testDatabaseUrl })
  await admin.query('CREATE SCHEMA ' + schema)
  const url = new URL(testDatabaseUrl)
  url.searchParams.set('options', '-c search_path=' + schema)
  process.env.DATABASE_URL = url.toString()
  process.env.JWT_SECRET = 'foundation-integration-tests-only-secret-32-bytes'
  const { pool } = await import('../config/db.js')
  const { migrate } = await import('../scripts/run-migrations.js')
  const { createApp } = await import('../app.js')
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined
  try {
    await pool.query('CREATE TABLE vocab(id serial PRIMARY KEY,word text NOT NULL,reading text,meaning text,jlpt_level text)')
    await pool.query("INSERT INTO vocab(word,reading,meaning,jlpt_level) VALUES('独自','どくじ','preservation fixture','N3')")
    await migrate()
    await migrate()
    assert.equal((await pool.query('SELECT count(*) FROM jlpt_schema_versions')).rows[0].count, '3')
    assert.equal((await pool.query('SELECT count(*) FROM vocab')).rows[0].count, '1')
    assert.equal((await pool.query('SELECT column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3', [schema, 'exam_attempts', 'saved_answers'])).rowCount, 1)
    const startedServer = createApp().listen(0)
    server = startedServer
    await new Promise<void>(resolve => startedServer.once('listening', resolve))
    const base = 'http://127.0.0.1:' + (startedServer.address() as AddressInfo).port + '/api'
    const request = async (path: string, method = 'GET', body?: unknown, token?: string) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
      const data = await response.json() as Record<string, unknown>
      return { status: response.status, data, headers: response.headers }
    }
    const account = { email: 'student@example.com', password: 'abcdefgh123' }
    assert.equal((await request('/auth/register', 'POST', { ...account, password: 'short' })).status, 400)
    assert.equal((await request('/auth/register', 'POST', account)).status, 201)
    assert.equal((await request('/auth/register', 'POST', { ...account, email: 'STUDENT@example.com' })).status, 409)
    assert.equal((await request('/auth/login', 'POST', { ...account, password: 'wrongpass' })).status, 401)
    const login = await request('/auth/login', 'POST', account)
    assert.equal(login.status, 200)
    const token = String(login.data.token)
    const identity = login.data.user as { id: string; email: string }
    assert.equal(typeof identity.id, 'string')
    assert.equal((await request('/auth/me', 'GET', undefined, token)).data.id, identity.id)
    const cookie = login.headers.get('set-cookie')?.split(';')[0]
    assert.ok(cookie?.startsWith('jlpt_session='))
    if (!cookie) throw new Error('Login did not return a session cookie')
    const cookieMe = await fetch(base + '/auth/me', { headers: { Cookie: cookie } })
    assert.equal(cookieMe.status, 200)
    assert.equal((await request('/me/state')).status, 401)
    assert.equal((await request('/me/preferences', 'PUT', { level: 'N4', targetLevel: 'N3', dailyMinutes: 30, furigana: true, romaji: false }, token)).status, 200)
    const entry = { id: 'original-cat', word: '猫', reading: 'ねこ', romaji: 'neko', meanings: ['mèo'], partOfSpeech: 'noun', level: 'N5', topic: 'animals', examples: [], source: { name: 'Original starter', license: 'Original' } }
    const first = await request('/me/cards', 'POST', { entry }, token)
    const duplicate = await request('/me/cards', 'POST', { entry }, token)
    assert.equal(first.status, 200)
    assert.equal(first.data.id, duplicate.data.id)
    const activity = { kind: 'grammar', itemId: 'original-grammar', minutes: 5, completed: true }
    await request('/me/activity', 'POST', activity, token)
    await request('/me/activity', 'POST', activity, token)
    assert.equal((await request('/me/activity', 'POST', { ...activity, minutes: -1 }, token)).status, 400)
    await Promise.all(Array.from({ length: 55 }, (_, index) => request('/me/history', 'POST', { query: 'test ' + index }, token)))
    const exam = { id: 'result-test', level: 'N5', score: 1, total: 2, bySkill: { vocabulary: { correct: 1, total: 2 } }, createdAt: new Date().toISOString(), answers: [] }
    await pool.query('INSERT INTO exam_attempts(id,user_id,level,questions,expires_at,result) VALUES($1,$2,$3,$4,now()+interval \'1 hour\',$5)', [exam.id, identity.id, 'N5', '[]', JSON.stringify(exam)])
    const state = (await request('/me/state', 'GET', undefined, token)).data
    assert.equal((state.cards as unknown[]).length, 1)
    assert.equal((state.activities as unknown[]).length, 1)
    assert.equal((state.history as unknown[]).length, 50)
    assert.deepEqual(state.exams, [exam])
    assert.equal((state.stats as { minutesToday: number }).minutesToday, 5)
    assert.equal((state.stats as { accuracy: number }).accuracy, 50)
    await request('/auth/register', 'POST', { email: 'other@example.com', password: account.password })
    const other = String((await request('/auth/login', 'POST', { email: 'other@example.com', password: account.password })).data.token)
    assert.equal((await request('/me/cards/' + first.data.id, 'DELETE', undefined, other)).status, 404)
    assert.equal(((await request('/me/state', 'GET', undefined, other)).data.cards as unknown[]).length, 0)
    assert.equal((await request('/me/cards/' + first.data.id + '/review', 'POST', { rating: 2 }, other)).status, 404)
    assert.equal((await request('/me/cards/' + first.data.id + '/review', 'POST', { rating: 4 }, token)).status, 400)
    const reviews = await Promise.all([
      request('/me/cards/' + first.data.id + '/review', 'POST', { rating: 2, reviewedAt: '2099-01-01T00:00:00Z' }, token),
      request('/me/cards/' + first.data.id + '/review', 'POST', { rating: 2 }, token)
    ])
    assert.deepEqual(reviews.map(value => value.status).sort(), [200, 409])
    const reviewedResponse = reviews.find(value => value.status === 200)
    assert.ok(reviewedResponse)
    const reviewed = reviewedResponse.data
    assert.equal(reviewed.repetitions, 1)
    assert.equal(reviewed.interval, 1)
    assert.ok(Math.abs(Date.parse(String(reviewed.lastReviewed)) - Date.now()) < 10000)
    assert.equal((await pool.query("SELECT count(*) FROM learning_activity WHERE user_id=$1 AND kind='review'", [identity.id])).rows[0].count, '1')
    await pool.query("UPDATE learning_cards SET due_at=now()-interval '1 second' WHERE id=$1", [first.data.id])
    assert.equal((await request('/me/cards/' + first.data.id + '/review', 'POST', { rating: 0 }, token)).data.repetitions, 0)
    assert.equal((await pool.query("SELECT count(*) FROM learning_activity WHERE user_id=$1 AND kind='review'", [identity.id])).rows[0].count, '2')
    assert.equal(((await request('/me/state', 'GET', undefined, token)).data.stats as { minutesToday: number }).minutesToday, 5)
    assert.equal((await request('/health/ready')).status, 200)
    assert.equal((await request('/unknown')).status, 404)
    const invalid = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
    assert.equal(invalid.status, 400)
    await pool.query('UPDATE users SET email=$1 WHERE id=$2', ['changed@example.com', identity.id])
    assert.equal((await request('/auth/me', 'GET', undefined, token)).status, 401)
  } finally {
    if (server) {
      const runningServer = server
      await new Promise<void>((resolve, reject) => runningServer.close(error => error ? reject(error) : resolve()))
    }
    await pool.end()
    await admin.end()
  }
})
