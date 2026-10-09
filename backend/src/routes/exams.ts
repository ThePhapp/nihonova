import { randomUUID } from 'crypto'
import { Router, RequestHandler } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth'
import { examQuestions, ExamQuestion, Level, isLevel } from '../content'

export interface ExamResult {
  id: string; level: Level; score: number; total: number
  bySkill: Record<string, { correct: number; total: number }>; createdAt: string
  answers: Array<{ questionId: string; answer: number; correctAnswer: number; correct: boolean; explanation: string }>
}
export interface Attempt {
  id: string; level: Level; questions: ExamQuestion[]; expiresAt: string
  savedAnswers?: Record<string, number>
}
export class ExamError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
export interface ExamStore {
  start(userId: string, level: Level, questions: ExamQuestion[]): Promise<Attempt>
  saveAnswers(userId: string, id: string, answers: unknown): Promise<{ success: true }>
  submit(userId: string, id: string, answers: unknown): Promise<ExamResult>
}

export function validateAnswers(value: unknown, questions: ExamQuestion[]): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ExamError(400, 'INVALID_ANSWERS', 'Câu trả lời phải là object.')
  const answers: Record<string, number> = Object.create(null) as Record<string, number>
  const entries = Object.entries(value)
  if (entries.length > questions.length) throw new ExamError(400, 'INVALID_ANSWERS', 'Có câu hỏi không thuộc bài thi.')
  for (const [id, answer] of entries) {
    const question = questions.find(item => item.id === id)
    if (!question || typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) throw new ExamError(400, 'INVALID_ANSWERS', 'ID câu hỏi hoặc chỉ số câu trả lời không hợp lệ.')
    answers[id] = answer
  }
  return answers
}

export function gradeAttempt(attempt: Attempt, answers: Record<string, number>, now: Date): ExamResult {
  const expired = now.getTime() >= Date.parse(attempt.expiresAt)
  const bySkill: ExamResult['bySkill'] = {}
  const graded = attempt.questions.map(question => {
    const answer = (expired ? attempt.savedAnswers ?? {} : answers)[question.id] ?? -1
    const correct = answer === question.answer
    const skill = bySkill[question.skill] ?? { correct: 0, total: 0 }
    skill.total++; if (correct) skill.correct++
    bySkill[question.skill] = skill
    return { questionId: question.id, answer, correctAnswer: question.answer, correct,
      explanation: expired ? `Đã hết giờ; chấm theo đáp án đã lưu trước hạn. ${question.explanation}` : question.explanation }
  })
  return { id: attempt.id, level: attempt.level, score: graded.filter(item => item.correct).length,
    total: graded.length, bySkill, createdAt: now.toISOString(), answers: graded }
}

// Load the shared pool only for actual database operations, so isolated tests need no DB configuration.
export class PostgresExamStore implements ExamStore {
  constructor(private loadPool = async () => (await import('../config/db.js')).pool) {}
  async start(userId: string, level: Level, questions: ExamQuestion[]): Promise<Attempt> {
    const pool = await this.loadPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock($1::integer)', [userId])
      const count = await client.query("SELECT COUNT(*)::integer AS count FROM exam_attempts WHERE user_id = $1 AND started_at > now() - interval '1 hour'", [userId])
      if (Number(count.rows[0].count) >= 10) throw new ExamError(429, 'EXAM_RATE_LIMIT', 'Tối đa 10 bài thi mỗi giờ.')
      const id = randomUUID()
      const saved = await client.query("INSERT INTO exam_attempts (id,user_id,level,questions,started_at,expires_at) VALUES ($1,$2,$3,$4::jsonb,now(),now() + interval '10 minutes') RETURNING expires_at", [id, userId, level, JSON.stringify(questions)])
      await client.query('COMMIT')
      return { id, level, questions, expiresAt: new Date(saved.rows[0].expires_at).toISOString() }
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }

  async submit(userId: string, id: string, value: unknown): Promise<ExamResult> {
    const pool = await this.loadPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const found = await client.query('SELECT id,level,questions,expires_at,saved_answers,result FROM exam_attempts WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId])
      const row = found.rows[0]
      if (!row) throw new ExamError(404, 'EXAM_NOT_FOUND', 'Không tìm thấy bài thi.')
      const attempt: Attempt = { id: row.id, level: row.level, questions: row.questions, expiresAt: new Date(row.expires_at).toISOString(), savedAnswers: row.saved_answers ?? {} }
      const answers = validateAnswers(value, attempt.questions)
      // A row lock serializes concurrent submissions; persisted results are immutable.
      if (row.result) { await client.query('COMMIT'); return row.result as ExamResult }
      const clock = await client.query('SELECT clock_timestamp() AS now')
      const now = new Date(clock.rows[0].now)
      if (now.getTime() >= Date.parse(attempt.expiresAt) && Object.keys(answers).length && !sameAnswers(answers, attempt.savedAnswers ?? {})) throw new ExamError(409, 'EXAM_EXPIRED', 'Đã hết giờ. Nộp answers: {} để nhận điểm từ đáp án đã lưu trước hạn.')
      const result = gradeAttempt(attempt, answers, now)
      await client.query('UPDATE exam_attempts SET result = $1::jsonb WHERE id = $2 AND user_id = $3', [JSON.stringify(result), id, userId])
      await client.query('COMMIT')
      return result
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }

  async saveAnswers(userId: string, id: string, value: unknown): Promise<{ success: true }> {
    const pool = await this.loadPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const found = await client.query('SELECT questions,expires_at,result FROM exam_attempts WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId])
      const row = found.rows[0]
      if (!row) throw new ExamError(404, 'EXAM_NOT_FOUND', 'Không tìm thấy bài thi.')
      const answers = validateAnswers(value, row.questions as ExamQuestion[])
      if (row.result) throw new ExamError(409, 'EXAM_SUBMITTED', 'Bài thi đã nộp.')
      const clock = await client.query('SELECT clock_timestamp() AS now')
      if (new Date(clock.rows[0].now).getTime() >= new Date(row.expires_at).getTime()) throw new ExamError(409, 'EXAM_EXPIRED', 'Đã hết giờ, không thể đổi đáp án.')
      await client.query('UPDATE exam_attempts SET saved_answers = $1::jsonb WHERE id = $2 AND user_id = $3', [JSON.stringify(answers), id, userId])
      await client.query('COMMIT')
      return { success: true }
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }
}

function sameAnswers(a: Record<string, number>, b: Record<string, number>): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => b[key] === value)
}

export function createExamsRouter(store: ExamStore = new PostgresExamStore(), authenticate: RequestHandler = authMiddleware) {
  const router = Router()
  router.use(authenticate)
  router.post('/start', async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' })
      const level: unknown = req.body?.level
      if (!isLevel(level)) throw new ExamError(400, 'INVALID_LEVEL', 'Cấp độ phải từ N5 đến N1.')
      const questions = examQuestions.filter(question => question.level === level)
      if (!questions.length) throw new ExamError(503, 'EXAM_UNAVAILABLE', 'Chưa có nội dung cho cấp độ này.')
      const attempt = await store.start(String(req.user.id), level, questions)
      res.json({ id: attempt.id, level, expiresAt: attempt.expiresAt,
        questions: attempt.questions.map(({ id, skill, prompt, options, audioText }) => ({ id, skill, prompt, options, ...(audioText ? { audioText } : {}) })) })
    } catch (error) { sendError(error, res) }
  })
  router.post('/:id/submit', async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' })
      if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(req.params.id)) throw new ExamError(400, 'INVALID_ID', 'ID bài thi không hợp lệ.')
      if (!req.body || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > 8192) throw new ExamError(400, 'INVALID_ANSWERS', 'Nội dung câu trả lời quá lớn hoặc thiếu.')
      res.json(await store.submit(String(req.user.id), req.params.id, req.body.answers))
    } catch (error) { sendError(error, res) }
  })
  router.put('/:id/answers', async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' })
      if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(req.params.id)) throw new ExamError(400, 'INVALID_ID', 'ID bài thi không hợp lệ.')
      if (!req.body || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > 8192) throw new ExamError(400, 'INVALID_ANSWERS', 'Nội dung câu trả lời quá lớn hoặc thiếu.')
      res.json(await store.saveAnswers(String(req.user.id), req.params.id, req.body.answers))
    } catch (error) { sendError(error, res) }
  })
  return router
}
function sendError(error: unknown, res: import('express').Response) {
  if (error instanceof ExamError) return res.status(error.status).json({ error: error.message, code: error.code })
  return res.status(503).json({ error: 'Dịch vụ thi tạm thời không khả dụng.', code: 'EXAM_UNAVAILABLE' })
}
export default createExamsRouter()
