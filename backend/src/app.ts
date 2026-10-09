import express from 'express'
import cors from 'cors'
import { pool } from './config/db'
import auth from './routes/auth'
import { jwtSecret } from './middleware/auth'
import me from './routes/me'
import dictionary from './routes/dictionary'
import content from './routes/content'
import { asyncRoute, errorHandler, rateLimit } from './middleware/http'
import { HttpError, level, text } from './services/validation'
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  const origins = (process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(origin => origin.trim()).filter(Boolean)
  app.use(cors({ origin: origins }))
  app.use(rateLimit(240))
  app.use(express.json({ limit: '32kb' }))
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.get('/api/health/ready', asyncRoute(async (_req, res) => {
    jwtSecret()
    await pool.query('SELECT user_id FROM learning_profiles LIMIT 0')
    await pool.query('SELECT saved_answers FROM exam_attempts LIMIT 0')
    await pool.query('SELECT id,email,password FROM users LIMIT 0; SELECT id,entry,due_at,interval,ease,repetitions,last_reviewed FROM learning_cards LIMIT 0; SELECT user_id,kind,item_id,minutes,completed,created_at FROM learning_activity LIMIT 0; SELECT user_id,query,created_at FROM learning_history LIMIT 0')
    res.json({ status: 'ready' })
  }))
  app.use('/api/auth', auth)
  app.use('/api/me', me)
  app.use('/api/dictionary', dictionary)
  app.use('/api/content', content)
  // Legacy data is read as-is; no crawler or seed runs during startup.
  app.get(['/api/vocabulary', '/api/vocab'], asyncRoute(async (req, res) => {
    const values: string[] = [], conditions: string[] = []
    if (req.query.level !== undefined) { values.push(level(req.query.level)); conditions.push('jlpt_level=$' + values.length) }
    if (req.query.search !== undefined) { values.push('%' + text(req.query.search, 100) + '%'); conditions.push('word ILIKE $' + values.length) }
    const result = await pool.query('SELECT * FROM vocab' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '') + ' ORDER BY id LIMIT 100', values)
    res.json(result.rows)
  }))
  app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found')))
  app.use(errorHandler)
  return app
}
export const app = createApp()
export default app
