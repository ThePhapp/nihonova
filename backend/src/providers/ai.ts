export const AI_LIMITS = Object.freeze({
  messageBytes: 4000, historyCount: 10, inputBytes: 16000,
  bodyBytes: 24000, outputTokens: 1024, outputBytes: 16000,
  responseBytes: 64000, timeoutMs: 15000, requestsPerMinute: 6,
  dailyTokens: 100000, concurrent: 4, users: 1000
})

export interface TutorMessage { role: 'user' | 'assistant'; content: string }
export interface TutorInput {
  message: string
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  explainVietnamese: boolean
  history: TutorMessage[]
}
export interface AiStatus { available: boolean; provider: string; reason?: string }
export interface TutorResult { reply: string; tokens: number }
export interface AiProvider {
  status(): AiStatus
  reservation(input: TutorInput): number
  tutor(input: TutorInput): Promise<TutorResult>
}
export class AiError extends Error {
  constructor(public readonly status: 400 | 429 | 503, public readonly code: string,
    message: string) { super(message) }
}
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= AI_LIMITS.messageBytes
}
export function validateTutor(value: unknown): TutorInput {
  const invalid = () => new AiError(400, 'AI_INVALID_INPUT', 'Invalid tutor request')
  if (!record(value) || Object.keys(value).some(key =>
    !['message', 'level', 'explainVietnamese', 'history'].includes(key)) ||
    !text(value.message) || typeof value.explainVietnamese !== 'boolean' ||
    typeof value.level !== 'string' || !['N5', 'N4', 'N3', 'N2', 'N1'].includes(value.level)) throw invalid()
  const history: TutorMessage[] = []
  if (value.history !== undefined) {
    if (!Array.isArray(value.history) || value.history.length > AI_LIMITS.historyCount) throw invalid()
    for (const item of value.history) {
      if (!record(item) || Object.keys(item).some(key => !['role', 'content'].includes(key)) ||
        (item.role !== 'user' && item.role !== 'assistant') || !text(item.content)) throw invalid()
      history.push({ role: item.role, content: item.content })
    }
  }
  if (Buffer.byteLength(value.message + history.map(item => item.content).join(''), 'utf8') >
    AI_LIMITS.inputBytes || Buffer.byteLength(JSON.stringify(value), 'utf8') > AI_LIMITS.bodyBytes) throw invalid()
  return { message: value.message, level: value.level as TutorInput['level'],
    explainVietnamese: value.explainVietnamese, history }
}

interface UserBudget { day: number; tokens: number; window: number; requests: number; active: number }
export interface BudgetLimits {
  requestsPerMinute: number; dailyTokens: number; concurrent: number; users: number
}
export class AiBudget {
  private readonly users = new Map<string, UserBudget>()
  private active = 0
  constructor(private readonly now: () => number = Date.now,
    private readonly limits: BudgetLimits = AI_LIMITS) {}

  reserve(id: string, tokens: number): (actual?: number) => void {
    if (!Number.isSafeInteger(tokens) || tokens < 1 || tokens > this.limits.dailyTokens)
      throw new AiError(429, 'AI_DAILY_BUDGET', 'Daily tutor token budget exceeded')
    const time = this.now()
    const day = Math.floor(time / 86400000)
    // Only expire previous-day idle accounts; evicting current budgets would bypass limits.
    for (const [key, user] of this.users) {
      if (user.day < day && user.active === 0) this.users.delete(key)
    }
    let user = this.users.get(id)
    if (!user) {
      if (this.users.size >= this.limits.users)
        throw new AiError(503, 'AI_CAPACITY', 'Tutor temporarily at capacity')
      user = { day, tokens: 0, window: time, requests: 0, active: 0 }
      this.users.set(id, user)
    }
    if (user.day !== day) { user.day = day; user.tokens = 0 }
    if (time - user.window >= 60000) { user.window = time; user.requests = 0 }
    if (user.requests >= this.limits.requestsPerMinute)
      throw new AiError(429, 'AI_RATE_LIMIT', 'Tutor request limit exceeded')
    if (user.tokens + tokens > this.limits.dailyTokens)
      throw new AiError(429, 'AI_DAILY_BUDGET', 'Daily tutor token budget exceeded')
    if (this.active >= this.limits.concurrent || user.active > 0)
      throw new AiError(429, 'AI_CONCURRENT_LIMIT', 'Tutor is busy; try again later')
    user.requests++; user.tokens += tokens; user.active++; this.active++
    const reservedUser = user
    let released = false
    return (actual?: number) => {
      if (released) return
      released = true
      reservedUser.active--; this.active--
      // Failed/ambiguous calls keep their reservation because upstream may have billed them.
      if (reservedUser.day === day && actual !== undefined && Number.isSafeInteger(actual) && actual >= 0)
        reservedUser.tokens += actual - tokens
    }
  }
}
