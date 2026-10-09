import test from 'node:test'
import assert from 'node:assert/strict'
import express, { RequestHandler } from 'express'
import { AddressInfo } from 'net'
import type { Pool, PoolClient } from 'pg'
import { examQuestions } from '../content'
import { Attempt, ExamError, ExamResult, ExamStore, PostgresExamStore, createExamsRouter, gradeAttempt, validateAnswers } from '../routes/exams'

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const questions = examQuestions.filter(question => question.level === 'N5')
const timely = new Date('2026-01-01T00:00:00Z')
const attempt: Attempt = { id, level: 'N5', questions, expiresAt: '2026-01-01T00:10:00Z' }
const correct = Object.fromEntries(questions.map(question => [question.id, question.answer]))
test('score is correct count, missing answers incorrect, skills and explanations retained', () => {
  const result = gradeAttempt(attempt, correct, timely)
  assert.equal(result.score, questions.length); assert.equal(result.total, questions.length)
  assert.equal(Object.values(result.bySkill).reduce((sum, skill) => sum + skill.total, 0), questions.length)
  assert.ok(result.answers.every(answer => answer.correct && answer.explanation))
  assert.equal(gradeAttempt(attempt, {}, timely).score, 0)
  assert.ok(gradeAttempt(attempt, {}, timely).answers.every(answer => answer.answer === -1))
})
test('at exact deadline only server-saved answers count', () => {
  const savedAnswers = { [questions[0].id]: questions[0].answer }
  const result = gradeAttempt({ ...attempt, savedAnswers }, correct, new Date(attempt.expiresAt))
  assert.equal(result.score, 1)
  assert.equal(result.answers[1].answer, -1)
  assert.match(result.answers[0].explanation, /đã lưu trước hạn/)
})
test('unknown IDs, wrong index types, negative, fractional and out-of-range choices rejected', () => {
  for (const value of [null, [], { unknown: 0 }, { [questions[0].id]: -1 }, { [questions[0].id]: 0.5 }, { [questions[0].id]: '0' }, { [questions[0].id]: questions[0].options.length }, { '__proto__': null, constructor: 0 }]) assert.throws(() => validateAnswers(value, questions), ExamError)
  assert.deepEqual({ ...validateAnswers(correct, questions) }, correct)
})

function fakeDatabase(options: { owner?: string; now?: Date; saved?: Record<string, number>; result?: ExamResult } = {}) {
  let result = options.result
  let savedAnswers = options.saved ?? {}
  let locked = false
  const queue: Array<() => void> = []
  const sql: string[] = []
  let writes = 0
  const pool = {
    async connect() {
      const client = {
        async query(query: string, values: unknown[] = []) {
          sql.push(query)
          if (query.includes('FOR UPDATE')) {
            if (locked) await new Promise<void>(resolve => queue.push(resolve))
            locked = true
            if (values[1] !== (options.owner ?? '1')) return { rows: [] }
            return { rows: [{ id, level: 'N5', questions, expires_at: attempt.expiresAt, saved_answers: savedAnswers, result }] }
          }
          if (query.includes('clock_timestamp')) return { rows: [{ now: options.now ?? timely }] }
          if (query.startsWith('UPDATE') && query.includes('SET result')) { writes++; result = JSON.parse(String(values[0])) as ExamResult }
          if (query.startsWith('UPDATE') && query.includes('SET saved_answers')) savedAnswers = JSON.parse(String(values[0])) as Record<string, number>
          if (query === 'COMMIT' || query === 'ROLLBACK') { locked = false; queue.shift()?.() }
          return { rows: [] }
        }, release() {}
      }
      return client as unknown as PoolClient
    }
  } as unknown as Pool
  return { store: new PostgresExamStore(async () => pool), sql, writes: () => writes, saved: () => savedAnswers }
}
test('ownership is in the locked query; unknown account cannot grade or save', async () => {
  const db = fakeDatabase()
  await assert.rejects(db.store.submit('2', id, {}), (error: unknown) => error instanceof ExamError && error.status === 404)
  await assert.rejects(db.store.saveAnswers('2', id, {}), (error: unknown) => error instanceof ExamError && error.status === 404)
  assert.equal(db.writes(), 0)
  assert.ok(db.sql.some(sql => sql.includes('user_id = $2 FOR UPDATE')))
})
test('concurrent submissions persist exactly once and retry returns identical JSON', async () => {
  const db = fakeDatabase()
  const [first, second] = await Promise.all([db.store.submit('1', id, correct), db.store.submit('1', id, {})])
  assert.deepEqual(second, first); assert.equal(db.writes(), 1)
  assert.deepEqual(await db.store.submit('1', id, correct), first)
})
test('autosave is validated, account scoped, rejects post-submit and late changes', async () => {
  const db = fakeDatabase()
  assert.deepEqual(await db.store.saveAnswers('1', id, correct), { success: true })
  assert.deepEqual(db.saved(), correct)
  await assert.rejects(db.store.saveAnswers('1', id, { unknown: 0 }), ExamError)
  await db.store.submit('1', id, correct)
  await assert.rejects(db.store.saveAnswers('1', id, correct), (error: unknown) => error instanceof ExamError && error.code === 'EXAM_SUBMITTED')
  const late = fakeDatabase({ now: new Date(attempt.expiresAt), saved: correct })
  await assert.rejects(late.store.saveAnswers('1', id, {}), (error: unknown) => error instanceof ExamError && error.code === 'EXAM_EXPIRED')
  const changed = { ...correct, [questions[0].id]: (questions[0].answer + 1) % questions[0].options.length }
  await assert.rejects(late.store.submit('1', id, changed), (error: unknown) => error instanceof ExamError && error.code === 'EXAM_EXPIRED')
  const expired = await late.store.submit('1', id, {})
  assert.equal(expired.score, questions.length)
  assert.deepEqual(await late.store.submit('1', id, correct), expired)
})

test('HTTP start hides all grading metadata and validates submissions and auth', async () => {
  let result: ExamResult | undefined
  const store: ExamStore = {
    async start(_user, level, questions) { return { ...attempt, level, questions } },
    async saveAnswers(_user, _id, answers) { validateAnswers(answers, questions); return { success: true } },
    async submit(user, _id, answers) {
      if (user !== '1') throw new ExamError(404, 'EXAM_NOT_FOUND', 'Not found')
      const validated = validateAnswers(answers, questions)
      return result ?? (result = gradeAttempt(attempt, validated, timely))
    }
  }
  const auth: RequestHandler = (req, res, next) => {
    const user = req.headers['x-test-user']
    if (typeof user !== 'string') { res.status(401).json({ error: 'Authentication required' }); return }
    Object.assign(req, { user: { id: user, email: 'test@example.invalid' } }); next()
  }
  const app = express(); app.use(express.json({ limit: '10kb' })); app.use('/exams', createExamsRouter(store, auth))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/exams`
  const send = (path: string, body: unknown, user = '1', method = 'POST') => fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': user } : {}) }, body: JSON.stringify(body) })
  try {
    const start = await send('/start', { level: 'N5' })
    const data = await start.json() as { questions: Array<Record<string, unknown>> }
    assert.equal(start.status, 200)
    for (const question of data.questions) {
      assert.deepEqual(Object.keys(question).sort(), question.skill === 'listening' ? ['audioText', 'id', 'options', 'prompt', 'skill'] : ['id', 'options', 'prompt', 'skill'])
      if (question.skill === 'listening') { assert.ok(question.audioText); assert.ok(!String(question.prompt).includes('女：')) }
    }
    assert.equal((await send('/start', { level: 'N0' })).status, 400)
    assert.equal((await send('/start', { level: 'N5' }, '')).status, 401)
    assert.equal((await send(`/${id}/submit`, { answers: { unknown: 0 } })).status, 400)
    assert.equal((await send(`/${id}/submit`, { answers: {} }, '2')).status, 404)
    assert.equal((await send(`/${id}/answers`, { answers: correct }, '1', 'PUT')).status, 200)
    const first = await (await send(`/${id}/submit`, { answers: correct })).json()
    assert.deepEqual(await (await send(`/${id}/submit`, { answers: {} })).json(), first)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
