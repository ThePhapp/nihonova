import { Request, Response, NextFunction, RequestHandler } from 'express'
import { HttpError } from '../services/validation'
export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res)).catch(next) }
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, code: error.code })
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code === '23505') return res.status(409).json({ error: 'Already exists' })
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0
  if (status === 400 || status === 413) return res.status(status).json({ error: status === 413 ? 'Request too large' : 'Invalid JSON' })
  return res.status(503).json({ error: 'Service temporarily unavailable' })
}
export function rateLimit(max: number, windowMs = 60000): RequestHandler {
  const buckets = new Map<string, { count: number; reset: number }>()
  return (req, res, next) => {
    const now = Date.now()
    for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key)
    const key = req.ip || 'unknown'
    const bucket = buckets.get(key) || { count: 0, reset: now + windowMs }
    if (bucket.count >= max || (!buckets.has(key) && buckets.size >= 10000)) {
      res.setHeader('Retry-After', Math.ceil((bucket.reset - now) / 1000))
      return res.status(429).json({ error: 'Too many requests' })
    }
    bucket.count++
    buckets.set(key, bucket)
    next()
  }
}
