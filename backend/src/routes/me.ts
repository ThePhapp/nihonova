import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { pool } from '../config/db'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncRoute, rateLimit } from '../middleware/http'
import { boolean, integer, object, text, HttpError } from '../services/validation'
import { entry, preferences, card, CardRow, learningState } from '../services/learning'
const router = Router()
router.use(rateLimit(120), authMiddleware)
function user(req: AuthenticatedRequest): string {
  if (!req.user) throw new HttpError(401, 'Authentication required')
  return req.user.id
}
router.get('/state', asyncRoute(async (req, res) => res.json(await learningState(user(req)))))
router.put('/preferences', asyncRoute(async (req, res) => {
  const value = preferences(req.body)
  await pool.query('INSERT INTO learning_profiles(user_id,preferences) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET preferences=EXCLUDED.preferences', [user(req), JSON.stringify(value)])
  res.json(value)
}))
router.post('/cards', asyncRoute(async (req, res) => {
  const snapshot = entry(object(req.body).entry)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user(req)])
    const existing = await client.query<CardRow>("SELECT * FROM learning_cards WHERE user_id=$1 AND entry->>'id'=$2", [user(req), snapshot.id])
    if (existing.rows[0]) { await client.query('COMMIT'); return res.json(card(existing.rows[0])) }
    const count = await client.query<{ count: string }>('SELECT count(*) FROM learning_cards WHERE user_id=$1', [user(req)])
    if (Number(count.rows[0].count) >= 5000) throw new HttpError(409, 'Saved card limit reached')
    const saved = await client.query<CardRow>('INSERT INTO learning_cards(id,user_id,entry) VALUES($1,$2,$3) RETURNING *', [randomUUID(), user(req), JSON.stringify(snapshot)])
    await client.query('COMMIT')
    res.json(card(saved.rows[0]))
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}))
router.delete('/cards/:id', asyncRoute(async (req, res) => {
  const id = text(req.params.id, 150)
  const deleted = await pool.query('DELETE FROM learning_cards WHERE id=$1 AND user_id=$2 RETURNING id', [id, user(req)])
  if (!deleted.rowCount) throw new HttpError(404, 'Card not found')
  res.json({ success: true })
}))
router.post('/activity', asyncRoute(async (req, res) => {
  const body = object(req.body)
  const kind = text(body.kind, 20)
  if (!['kanji', 'grammar', 'reading', 'listening'].includes(kind)) throw new HttpError(400, 'Invalid activity kind')
  const itemId = text(body.itemId, 150), minutes = integer(body.minutes, 0, 180), completed = boolean(body.completed)
  await pool.query('INSERT INTO learning_activity(user_id,kind,item_id,minutes,completed) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [user(req), kind, itemId, minutes, completed])
  res.json({ success: true })
}))
router.post('/history', asyncRoute(async (req, res) => {
  const query = text(object(req.body).query, 100).trim()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user(req)])
    await client.query('INSERT INTO learning_history(user_id,query) VALUES($1,$2) ON CONFLICT(user_id,query) DO UPDATE SET created_at=clock_timestamp()', [user(req), query])
    await client.query('DELETE FROM learning_history WHERE user_id=$1 AND query NOT IN (SELECT query FROM learning_history WHERE user_id=$1 ORDER BY created_at DESC,query LIMIT 50)', [user(req)])
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}))
export default router
