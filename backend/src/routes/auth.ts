import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db'
import { authMiddleware, AuthenticatedRequest, jwtSecret } from '../middleware/auth'
import { asyncRoute, rateLimit } from '../middleware/http'
import { credentials, HttpError } from '../services/validation'
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
  const secret = jwtSecret()
  const result = await pool.query<{ id: number; email: string; password: string }>('SELECT id,email,password FROM users WHERE lower(btrim(email))=$1', [email])
  const user = result.rows[0]
  // Spend the same bcrypt work even for an unknown account.
  const hash = user?.password || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5Ih5wSgX2pLZhaQj8uBNBM6eLR1xG9W'
  const valid = await bcrypt.compare(password, hash)
  if (!user || !valid) throw new HttpError(401, 'Email or password incorrect')
  const identity = { id: String(user.id), email: user.email }
  const token = jwt.sign(identity, secret, { algorithm: 'HS256', expiresIn: '24h' })
  res.json({ success: true, token, user: identity })
}))
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => res.json(req.user))
export default router
