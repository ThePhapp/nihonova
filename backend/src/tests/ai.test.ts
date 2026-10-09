import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import { request as httpsRequest } from 'node:https'
import { IncomingMessage } from 'node:http'
import { Request, Response, NextFunction, Router, RequestHandler } from 'express'
import { AI_LIMITS, AiBudget, AiError, AiProvider, validateTutor } from '../providers/ai'
import { AiHttp, createAnthropicHttp, createAnthropicProvider } from '../providers/aiAnthropic'
import { createAiRouter } from '../routes/ai'

const input = validateTutor({ message: '日本語を教えて', level: 'N5', explainVietnamese: true })
const response = (reply = 'Xin chào', usage = { input_tokens: 30, output_tokens: 10 }) =>
  JSON.stringify({ type: 'message', role: 'assistant', content: [{ type: 'text', text: reply }], usage })
const mockProvider = (tutor: AiProvider['tutor'] = async () => ({ reply: '説明', tokens: 10 })): AiProvider => ({
  status: () => ({ available: true, provider: 'mock' }), reservation: () => 100, tutor
})
const auth: RequestHandler = (req, _res, next) => {
  Object.assign(req, { user: { id: 'account-a', email: 'test@example.invalid' } }); next()
}

// Exercise Express routing and its actual JSON parser entirely in memory, without a listening socket.
function invoke(router: Router, method: string, path: string, raw?: string,
  headers: Record<string, string> = {}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(raw === undefined ? [] : [Buffer.from(raw)])
    const req = Object.assign(stream, { method, url: path, originalUrl: path,
      headers: { ...(raw === undefined ? {} : { 'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(raw)) }), ...headers },
      is: (type: string) => type === 'application/json' &&
        (headers['content-type'] || 'application/json') === 'application/json' }) as unknown as Request
    let status = 200
    const res = { status(code: number) { status = code; return this },
      json(body: unknown) { resolve({ status, body }); return this } } as unknown as Response
    const handler = router as unknown as { handle(req: Request, res: Response, next: NextFunction): void }
    handler.handle(req, res, error => reject(error || new Error('Route did not respond')))
  })
}

test('Anthropic schema, headers, model and usage are verified with mock HTTP', async () => {
  const http: AiHttp = async request => {
    assert.equal(request.url, 'https://api.anthropic.com/v1/messages')
    assert.equal(request.headers['x-api-key'], 'test-only-placeholder')
    assert.equal(request.headers['anthropic-version'], '2023-06-01')
    assert.equal(request.timeoutMs, AI_LIMITS.timeoutMs)
    assert.equal(request.maxResponseBytes, AI_LIMITS.responseBytes)
    const body = JSON.parse(request.body)
    assert.equal(body.model, 'configured-model')
    assert.equal(body.max_tokens, 1024)
    assert.match(body.system, /Vietnamese/)
    assert.deepEqual(body.messages, [{ role: 'user', content: input.message }])
    assert.ok(!('apiKey' in body))
    return { status: 200, body: response() }
  }
  const provider = createAnthropicProvider({ apiKey: 'test-only-placeholder', model: 'configured-model' }, http)
  assert.deepEqual(await provider.tutor(input), { reply: 'Xin chào', tokens: 40 })
  assert.ok(provider.reservation(input) > 1024)
})

test('missing credentials and invalid config disable without touching HTTP', async () => {
  for (const config of [{}, { apiKey: ' ' }, { apiKey: 'test', model: 'bad model' }, { apiKey: 'bad\nkey' }]) {
    const provider = createAnthropicProvider(config, async () => { assert.fail('HTTP must not run') })
    assert.equal(provider.status().available, false)
    await assert.rejects(provider.tutor(input), (error: unknown) => error instanceof AiError && error.status === 503)
  }
})

test('provider errors, malformed responses and excessive outputs are sanitized', async () => {
  const mocks: AiHttp[] = [
    async () => { throw new Error('secret key upstream stack') },
    ...[401, 429, 500].map(status => async () => ({ status, body: 'secret key upstream stack' })),
    ...['bad JSON', '{}', response('x'.repeat(AI_LIMITS.outputBytes + 1)),
      response('ok', { input_tokens: -1, output_tokens: 1 }),
      response('ok', { input_tokens: 1, output_tokens: 1025 }),
      'x'.repeat(AI_LIMITS.responseBytes + 1)].map(body => async () => ({ status: 200, body }))
  ]
  for (const http of mocks) {
    await assert.rejects(createAnthropicProvider({ apiKey: 'test' }, http).tutor(input),
      (error: unknown) => error instanceof AiError && error.status === 503 && !/secret|stack/.test(error.message))
  }
})

test('input bounds cover roles, Unicode bytes, history, total size and unknown fields', () => {
  for (const body of [null, { ...input, message: '' }, { ...input, message: '日'.repeat(1334) },
    { ...input, level: 'N0' }, { ...input, explainVietnamese: 'true' },
    { ...input, history: [{ role: 'system', content: 'inject' }] },
    { ...input, history: Array(11).fill({ role: 'user', content: 'a' }) },
    { ...input, history: Array(5).fill({ role: 'user', content: 'x'.repeat(4000) }) },
    { ...input, max_tokens: 100000 }, { ...input, history: [{ role: 'user', content: 'a', extra: 1 }] }]) {
    assert.throws(() => validateTutor(body), AiError)
  }
})

test('budgets reserve before calls, reconcile once, retain ambiguous charges and reset daily', () => {
  let time = 0
  const budget = new AiBudget(() => time, { dailyTokens: 200, requestsPerMinute: 2, concurrent: 1, users: 2 })
  const release = budget.reserve('a', 120)
  assert.throws(() => budget.reserve('a', 20), /busy/)
  assert.throws(() => budget.reserve('b', 20), /busy/)
  release(50); release(0)
  budget.reserve('a', 120)()
  assert.throws(() => budget.reserve('a', 1), /request limit/)
  time = 60000
  assert.throws(() => budget.reserve('a', 31), /budget/)
  budget.reserve('a', 30)()
  time = 86400000
  budget.reserve('a', 200)()
})

test('user map refuses eviction of current budgets and expires only idle prior days', () => {
  let time = 0
  const budget = new AiBudget(() => time, { dailyTokens: 200, requestsPerMinute: 10, concurrent: 2, users: 1 })
  const release = budget.reserve('a', 20)
  assert.throws(() => budget.reserve('b', 20), /capacity/)
  time = 86400000
  assert.throws(() => budget.reserve('b', 20), /capacity/)
  release()
  budget.reserve('b', 20)()
})

test('route public status, disabled 503, existing auth and success contract', async () => {
  const disabled = createAiRouter({ provider: createAnthropicProvider({}), auth })
  assert.deepEqual(await invoke(disabled, 'GET', '/status'), { status: 200,
    body: { available: false, provider: 'anthropic', reason: 'Tutor provider is not configured' } })
  assert.equal((await invoke(disabled, 'POST', '/tutor', JSON.stringify(input))).status, 503)
  assert.equal((await invoke(createAiRouter({ provider: mockProvider() }), 'POST', '/tutor', JSON.stringify(input))).status, 401)
  const result = await invoke(createAiRouter({ provider: mockProvider(), auth }), 'POST', '/tutor', JSON.stringify(input))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { reply: '説明', provider: 'mock', notice: 'AI có thể trả lời sai. Hội thoại không được lưu trên máy chủ.' })
})

test('route rejects malformed, oversized, compressed and non-JSON bodies', async () => {
  let calls = 0
  const router = createAiRouter({ provider: mockProvider(async () => { calls++; return { reply: 'ok', tokens: 1 } }), auth })
  for (const [raw, headers] of [ ['{', {}], [JSON.stringify({ ...input, extra: 'x'.repeat(25000) }), {}],
    [JSON.stringify(input), { 'content-encoding': 'gzip' }],
    [JSON.stringify(input), { 'content-type': 'text/plain' }],
    [JSON.stringify({ ...input, history: [{ role: 'system', content: 'bad' }] }), {}]
  ] as Array<[string, Record<string, string>]>) {
    assert.equal((await invoke(router, 'POST', '/tutor', raw, headers)).status, 400)
  }
  assert.equal(calls, 0)
})

test('HTTP transport enforces deadline, byte cap and aborts without opening sockets', async () => {
  for (const mode of ['timeout', 'large', 'aborted', 'success', 'unauthorized']) {
    let destroyed = false
    const request = ((_url: unknown, _options: unknown, callback: (res: IncomingMessage) => void) => {
      const req = Object.assign(new EventEmitter(), {
        destroy() { destroyed = true; return this },
        end() {
          if (mode === 'timeout') return
          setImmediate(() => {
            const res = Object.assign(new EventEmitter(), { statusCode: mode === 'unauthorized' ? 401 : 200,
              destroy() { destroyed = true; return this } })
            callback(res as unknown as IncomingMessage)
            if (mode === 'aborted') res.emit('aborted')
            else { res.emit('data', Buffer.from(mode === 'large' ? 'x'.repeat(11) : 'ok')); res.emit('end') }
          })
        }
      })
      return req
    }) as unknown as typeof httpsRequest
    const call = createAnthropicHttp(request)({ url: 'https://api.anthropic.com/v1/messages',
      headers: {}, body: '{}', timeoutMs: 20, maxResponseBytes: 10 })
    if (mode === 'success') assert.deepEqual(await call, { status: 200, body: 'ok' })
    else if (mode === 'unauthorized') assert.deepEqual(await call, { status: 401, body: '' })
    else await assert.rejects(call, AiError)
    if (mode === 'timeout' || mode === 'large' || mode === 'unauthorized') assert.equal(destroyed, true)
  }
})

test('already parsed bodies still receive local validation and budgeted calls release on failure', async () => {
  const preParsed: RequestHandler = (req, _res, next) => {
    req.body = { ...input, message: 'x'.repeat(4001) }
    Object.assign(req, { _body: true, user: { id: 'a', email: 'a@example.invalid' } }); next()
  }
  assert.equal((await invoke(createAiRouter({ auth: preParsed, provider: mockProvider() }),
    'POST', '/tutor', JSON.stringify(input))).status, 400)
  const router = createAiRouter({ auth, provider: mockProvider(async () => { throw new Error('secret') }),
    budget: new AiBudget(Date.now, { dailyTokens: 100, requestsPerMinute: 6, concurrent: 1, users: 2 }) })
  assert.equal((await invoke(router, 'POST', '/tutor', JSON.stringify(input))).status, 503)
  const second = await invoke(router, 'POST', '/tutor', JSON.stringify(input))
  assert.equal(second.status, 429)
  assert.match(JSON.stringify(second.body), /AI_DAILY_BUDGET/)
})

test('route reserves concurrent and daily limits before provider; errors remain safe', async () => {
  let finish: ((result: { reply: string; tokens: number }) => void) | undefined
  let calls = 0
  const provider = mockProvider(() => { calls++; return new Promise(resolve => { finish = resolve }) })
  const router = createAiRouter({ provider, auth,
    budget: new AiBudget(Date.now, { dailyTokens: 100, requestsPerMinute: 6, concurrent: 1, users: 2 }) })
  const first = invoke(router, 'POST', '/tutor', JSON.stringify(input))
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal((await invoke(router, 'POST', '/tutor', JSON.stringify(input))).status, 429)
  assert.equal(calls, 1)
  assert.ok(finish)
  finish({ reply: 'ok', tokens: 100 })
  assert.equal((await first).status, 200)
  assert.equal((await invoke(router, 'POST', '/tutor', JSON.stringify(input))).status, 429)
  const failed = await invoke(createAiRouter({ auth, provider: mockProvider(async () => {
    throw new Error('secret provider stack')
  }) }), 'POST', '/tutor', JSON.stringify(input))
  assert.equal(failed.status, 503)
  assert.ok(!JSON.stringify(failed.body).includes('secret'))
})
