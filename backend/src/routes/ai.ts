import { Router, json, RequestHandler, ErrorRequestHandler } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { AI_LIMITS, AiBudget, AiError, AiProvider, validateTutor } from '../providers/ai'
import { createAnthropicProvider } from '../providers/aiAnthropic'

export interface AiRouterOptions { provider?: AiProvider; auth?: RequestHandler; budget?: AiBudget }
export function createAiRouter(options: AiRouterOptions = {}): Router {
  const router = Router()
  const provider = options.provider || createAnthropicProvider()
  const budget = options.budget || new AiBudget()
  router.get('/status', (_req, res) => { res.json(provider.status()) })
  router.post('/tutor', options.auth || authMiddleware,
    json({ limit: AI_LIMITS.bodyBytes, strict: true, inflate: false }),
    async (req: AuthenticatedRequest, res) => {
      let release: ((actual?: number) => void) | undefined
      try {
        if (typeof req.user?.id !== 'string' || !req.user.id.trim() || req.user.id.length > 128) {
          res.status(401).json({ error: 'Authentication required' }); return
        }
        if (!provider.status().available) throw new AiError(503, 'AI_DISABLED', 'Tutor provider is not configured')
        if (!req.is('application/json')) throw new AiError(400, 'AI_INVALID_INPUT', 'JSON body required')
        const input = validateTutor(req.body as unknown)
        release = budget.reserve(req.user.id, provider.reservation(input))
        const result = await provider.tutor(input)
        if (typeof result.reply !== 'string' || !result.reply.trim() ||
          Buffer.byteLength(result.reply) > AI_LIMITS.outputBytes || !Number.isSafeInteger(result.tokens) || result.tokens < 0)
          throw new Error('Invalid provider result')
        release(result.tokens)
        res.json({ reply: result.reply, provider: provider.status().provider,
          notice: 'AI có thể trả lời sai. Hội thoại không được lưu trên máy chủ.' })
      } catch (error) {
        // Never expose transport errors, response bodies, keys or internal details.
        const safe = error instanceof AiError ? error :
          new AiError(503, 'AI_PROVIDER_UNAVAILABLE', 'Tutor provider temporarily unavailable')
        res.status(safe.status).json({ error: safe.message, code: safe.code })
      } finally { release?.() }
    })
  const bodyError: ErrorRequestHandler = (_error: unknown, _req, res, _next) => {
    res.status(400).json({ error: 'Invalid or oversized JSON body', code: 'AI_INVALID_INPUT' })
  }
  router.use(bodyError)
  return router
}

export default createAiRouter()
