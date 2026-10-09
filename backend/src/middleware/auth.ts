import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db'
import { HttpError } from '../services/validation'
export interface AuthenticatedRequest extends Request { user?: { id: string; email: string } }
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) throw new HttpError(503, 'Authentication is not configured')
  return secret
}
export function verifySession(token: string) {
  const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] })
  if (typeof decoded === 'string' || typeof decoded.id !== 'string' || !/^[1-9]\d{0,9}$/.test(decoded.id) || Number(decoded.id) > 2147483647 || typeof decoded.email !== 'string' || typeof decoded.exp !== 'number') throw new HttpError(401, 'Invalid session')
  return { id: decoded.id, email: decoded.email }
}
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')
  if (!match || match[1].length > 4096) return res.status(401).json({ error: 'Authentication required' })
  let session: { id: string; email: string }
  try { session = verifySession(match[1]) } catch (error) {
    if (error instanceof HttpError && error.status === 503) return next(error)
    return res.status(401).json({ error: 'Invalid session' })
  }
  pool.query<{ id: number; email: string }>('SELECT id,email FROM users WHERE id=$1', [session.id]).then(result => {
    const user = result.rows[0]
    if (!user || user.email !== session.email) return res.status(401).json({ error: 'Invalid session' })
    req.user = { id: String(user.id), email: user.email }
    next()
  }).catch(next)
}
