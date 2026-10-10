import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db'
import { HttpError } from '../services/validation'
export const SESSION_COOKIE = 'jlpt_session'
const SESSION_TTL_SECONDS = 24 * 60 * 60
export interface SessionIdentity { id: string; email: string; sessionVersion: number }
export interface AuthenticatedRequest extends Request { user?: SessionIdentity }
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) throw new HttpError(503, 'Authentication is not configured')
  return secret
}
export function verifySession(token: string) {
  const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] })
  const sessionVersion = typeof decoded === 'string' ? undefined : decoded.sv ?? 0
  if (typeof decoded === 'string' || typeof decoded.id !== 'string' || !/^[1-9]\d{0,9}$/.test(decoded.id) || Number(decoded.id) > 2147483647 || typeof decoded.email !== 'string' || decoded.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded.email) || typeof decoded.exp !== 'number' || typeof sessionVersion !== 'number' || !Number.isSafeInteger(sessionVersion) || sessionVersion < 0) throw new HttpError(401, 'Invalid session')
  return { id: decoded.id, email: decoded.email, sessionVersion }
}
export function signSession(identity: SessionIdentity): string {
  return jwt.sign({ id: identity.id, email: identity.email, sv: identity.sessionVersion }, jwtSecret(), { algorithm: 'HS256', expiresIn: SESSION_TTL_SECONDS })
}
export function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append('Set-Cookie', `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/api; HttpOnly; SameSite=Strict${secure}`)
}
export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/api; HttpOnly; SameSite=Strict${secure}`)
}
function cookieToken(header: string | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return value.join('=') || null
  }
  return null
}
export function protectCookieRequests(origins: string[]) {
  const allowed = new Set(origins)
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.headers.authorization || !cookieToken(req.headers.cookie)) return next()
    const origin = req.headers.origin
    if (!origin || !allowed.has(origin)) return res.status(403).json({ error: 'Request origin is not allowed' })
    next()
  }
}
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')
  const token = match?.[1] ?? cookieToken(req.headers.cookie)
  if (!token || token.length > 4096) return res.status(401).json({ error: 'Authentication required' })
  let session: SessionIdentity
  try { session = verifySession(token) } catch (error) {
    if (error instanceof HttpError && error.status === 503) return next(error)
    return res.status(401).json({ error: 'Invalid session' })
  }
  pool.query<{ id: number; email: string; session_version: number }>('SELECT id,email,session_version FROM users WHERE id=$1', [session.id]).then(result => {
    const user = result.rows[0]
    if (!user || user.email !== session.email || user.session_version !== session.sessionVersion) return res.status(401).json({ error: 'Invalid session' })
    req.user = { id: String(user.id), email: user.email, sessionVersion: user.session_version }
    next()
  }).catch(next)
}
