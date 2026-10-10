import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db'
import { authMiddleware, AuthenticatedRequest, clearSessionCookie, jwtSecret, setSessionCookie, signSession } from '../middleware/auth'
import { asyncRoute, rateLimit } from '../middleware/http'
import { credentials, HttpError, object, password } from '../services/validation'
const router = Router()
router.post('/register', rateLimit(10), asyncRoute(async (req, res) => {
  const { email, password } = credentials(req.body)
  jwtSecret()
  const hash = await bcrypt.hash(password, 12)
  await pool.query('INSERT INTO users(email,password) VALUES($1,$2)', [email, hash])
  res.status(201).json({ success: true })
}))
router.post('/login', rateLimit(20), asyncRoute(async (req, res) => {
  const { email, password } = credentials(req.body)
  jwtSecret()
  const result = await pool.query<{ id: number; email: string; password: string; session_version: number }>('SELECT id,email,password,session_version FROM users WHERE lower(btrim(email))=$1', [email])
  const user = result.rows[0]
  // Spend the same bcrypt work even for an unknown account.
  const hash = user?.password || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5Ih5wSgX2pLZhaQj8uBNBM6eLR1xG9W'
  const valid = await bcrypt.compare(password, hash)
  if (!user || !valid) throw new HttpError(401, 'Email or password incorrect')
  const identity = { id: String(user.id), email: user.email, sessionVersion: user.session_version }
  const token = signSession(identity)
  setSessionCookie(res, token)
  res.json({ success: true, token, user: { id: identity.id, email: identity.email } })
}))
router.post('/logout', (_req, res) => { clearSessionCookie(res); res.status(204).end() })
router.post('/password', rateLimit(5), authMiddleware, asyncRoute(async (req: AuthenticatedRequest, res) => {
  if (!req.user) throw new HttpError(401, 'Authentication required')
  const body = object(req.body)
  const currentPassword = password(body.currentPassword)
  const newPassword = password(body.newPassword)
  if (currentPassword === newPassword) throw new HttpError(400, 'New password must be different')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query<{ id: number; email: string; password: string; session_version: number }>('SELECT id,email,password,session_version FROM users WHERE id=$1 FOR UPDATE', [req.user.id])
    const user = found.rows[0]
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) throw new HttpError(401, 'Current password is incorrect')
    const hash = await bcrypt.hash(newPassword, 12)
    const updated = await client.query<{ session_version: number }>('UPDATE users SET password=$1,session_version=session_version+1 WHERE id=$2 RETURNING session_version', [hash, req.user.id])
    await client.query('COMMIT')
    const identity = { id: req.user.id, email: user.email, sessionVersion: updated.rows[0].session_version }
    const token = signSession(identity)
    setSessionCookie(res, token)
    res.json({ success: true, token, user: { id: identity.id, email: identity.email } })
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}))
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })
  setSessionCookie(res, signSession(req.user))
  res.json({ id: req.user.id, email: req.user.email })
})
export default router
