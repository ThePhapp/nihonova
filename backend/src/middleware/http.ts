import { Request, Response, NextFunction, RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'
import { HttpError } from '../services/validation'
interface RequestWithId extends Request { requestId?: string }
export function requestContext(): RequestHandler {
  return (req: RequestWithId, res, next) => {
    const supplied = req.headers['x-request-id']
    req.requestId = typeof supplied === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(supplied) ? supplied : randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    const started = process.hrtime.bigint()
    res.once('finish', () => {
      if (process.env.LOG_REQUESTS !== 'true') return
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000
      console.info(JSON.stringify({ type: 'http', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(durationMs) }))
    })
    next()
  }
}
export function securityHeaders(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  }
}
export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res)).catch(next) }
}
export function errorHandler(error: unknown, req: RequestWithId, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, code: error.code })
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code === '23505') return res.status(409).json({ error: 'Already exists' })
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0
  if (status === 400 || status === 413) return res.status(status).json({ error: status === 413 ? 'Request too large' : 'Invalid JSON' })
  if (process.env.NODE_ENV === 'production' || process.env.LOG_REQUESTS === 'true') console.error(JSON.stringify({ type: 'error', requestId: req.requestId, method: req.method, path: req.path, code: code || 'UNEXPECTED_ERROR' }))
  return res.status(503).json({ error: 'Service temporarily unavailable' })
}
export function rateLimit(max: number, windowMs = 60000): RequestHandler {
  const buckets = new Map<string, { count: number; reset: number }>()
  let nextSweep = 0
  return (req, res, next) => {
    const now = Date.now()
    if (now >= nextSweep) {
      for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key)
      nextSweep = now + windowMs
    }
    const key = req.ip || 'unknown'
    const bucket = buckets.get(key) || { count: 0, reset: now + windowMs }
    const remaining = Math.max(0, max - bucket.count - 1)
    res.setHeader('RateLimit-Limit', max)
    res.setHeader('RateLimit-Remaining', remaining)
    res.setHeader('RateLimit-Reset', Math.ceil(bucket.reset / 1000))
    if (bucket.count >= max || (!buckets.has(key) && buckets.size >= 10000)) {
      res.setHeader('Retry-After', Math.ceil((bucket.reset - now) / 1000))
      res.setHeader('RateLimit-Remaining', 0)
      return res.status(429).json({ error: 'Too many requests' })
    }
    bucket.count++
    buckets.set(key, bucket)
    next()
  }
}
