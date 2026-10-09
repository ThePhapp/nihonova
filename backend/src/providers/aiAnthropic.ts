import { request as httpsRequest } from 'node:https'
import { AI_LIMITS, AiError, AiProvider, AiStatus, record, TutorInput, TutorResult } from './ai'

// Verified against https://platform.claude.com/docs/en/api/messages/create and /api/overview.
export interface AiHttpRequest {
  url: string; headers: Record<string, string>; body: string
  timeoutMs: number; maxResponseBytes: number
}
export interface AiHttpResponse { status: number; body: string }
export type AiHttp = (request: AiHttpRequest) => Promise<AiHttpResponse>
const unavailable = () => new AiError(503, 'AI_PROVIDER_UNAVAILABLE', 'Tutor provider temporarily unavailable')

export function createAnthropicHttp(request: typeof httpsRequest = httpsRequest): AiHttp {
  return options => new Promise((resolve, reject) => {
    let settled = false
    const finish = (error?: Error, result?: AiHttpResponse) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(unavailable())
      else if (result) resolve(result)
    }
    const req = request(options.url, { method: 'POST', headers: options.headers }, res => {
      if (res.statusCode !== 200) {
        finish(undefined, { status: res.statusCode || 503, body: '' })
        res.destroy()
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > options.maxResponseBytes) { finish(unavailable()); res.destroy(); req.destroy() }
        else chunks.push(chunk)
      })
      res.on('end', () => finish(undefined, { status: 200, body: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', () => finish(unavailable()))
      res.on('aborted', () => finish(unavailable()))
    })
    const timer = setTimeout(() => { finish(unavailable()); req.destroy() }, options.timeoutMs)
    req.on('error', () => finish(unavailable()))
    req.end(options.body)
  })
}
export const anthropicHttp = createAnthropicHttp()

export interface AnthropicConfig { apiKey?: string; model?: string }
export function createAnthropicProvider(config: AnthropicConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.AI_MODEL
}, http: AiHttp = anthropicHttp): AiProvider {
  const apiKey = config.apiKey?.trim()
  const model = config.model?.trim() || 'claude-haiku-4-5-20251001'
  const configured = Boolean(apiKey && !/[\r\n]/.test(apiKey) && apiKey.length <= 512 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(model))
  const status = (): AiStatus => configured
    ? { available: true, provider: 'anthropic' }
    : { available: false, provider: 'anthropic', reason: 'Tutor provider is not configured' }
  const system = (input: TutorInput) => `You are a Japanese JLPT tutor for level ${input.level}. ` +
    (input.explainVietnamese ? 'Explain in Vietnamese with Japanese examples. ' : 'Explain in Japanese. ') +
    'Stay focused on Japanese learning. AI answers may be incorrect; acknowledge uncertainty.'
  const payload = (input: TutorInput) => ({ model, max_tokens: AI_LIMITS.outputTokens,
    system: system(input), messages: [...input.history, { role: 'user', content: input.message }] })
  return {
    status,
    // UTF-8 bytes plus per-message framing is deliberately conservative for text-only requests.
    reservation: input => Buffer.byteLength(JSON.stringify(payload(input)), 'utf8') +
      (input.history.length + 1) * 64 + 1024 + AI_LIMITS.outputTokens,
    async tutor(input): Promise<TutorResult> {
      if (!configured || !apiKey) throw new AiError(503, 'AI_DISABLED', 'Tutor provider is not configured')
      try {
        const response = await http({ url: 'https://api.anthropic.com/v1/messages',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify(payload(input)), timeoutMs: AI_LIMITS.timeoutMs,
          maxResponseBytes: AI_LIMITS.responseBytes })
        if (response.status !== 200 || Buffer.byteLength(response.body) > AI_LIMITS.responseBytes) throw unavailable()
        const value: unknown = JSON.parse(response.body)
        if (!record(value) || value.type !== 'message' || value.role !== 'assistant' ||
          !Array.isArray(value.content) || value.content.length > 32 || !record(value.usage)) throw unavailable()
        const parts: string[] = []
        for (const block of value.content) {
          if (!record(block) || block.type !== 'text' || typeof block.text !== 'string') throw unavailable()
          parts.push(block.text)
        }
        const reply = parts.join('\n')
        const inputTokens = value.usage.input_tokens
        const outputTokens = value.usage.output_tokens
        if (!reply.trim() || Buffer.byteLength(reply) > AI_LIMITS.outputBytes ||
          typeof inputTokens !== 'number' || !Number.isSafeInteger(inputTokens) || inputTokens < 0 ||
          typeof outputTokens !== 'number' || !Number.isSafeInteger(outputTokens) || outputTokens < 0 ||
          outputTokens > AI_LIMITS.outputTokens || !Number.isSafeInteger(inputTokens + outputTokens)) throw unavailable()
        return { reply, tokens: inputTokens + outputTokens }
      } catch { throw unavailable() }
    }
  }
}
