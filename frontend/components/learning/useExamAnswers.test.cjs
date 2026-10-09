const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Run the hook's asynchronous save workflow without a browser or provider calls.
function harness(api) {
  const slots = []
  let cursor = 0
  let effects = []
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => value === b[index])
  const react = {
    useRef(value) { const index = cursor++; return slots[index] ?? (slots[index] = { current: value }) },
    useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }] },
    useCallback(callback, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, callback }; return slots[index].callback },
    useEffect(callback, deps) {
      const index = cursor++
      if (!same(slots[index]?.deps, deps)) effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: callback() } })
    },
  }
  const source = fs.readFileSync(`${__dirname}/useExamAnswers.ts`, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const exports = {}
  const dependencies = { react, '@/utils/api': { api }, './shared': { errorText: error => error.message } }
  new Function('require', 'exports', 'window', code)(name => dependencies[name], exports, { setTimeout, clearTimeout })
  return {
    render(attempt, answers) { cursor = 0; effects = []; const result = exports.useExamAnswers(attempt, answers); effects.forEach(effect => effect()); return result },
    dispose() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}
const attempt = () => ({ id: 'owned-attempt', expiresAt: new Date(Date.now() + 60000).toISOString() })
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

test('saved status appears only after a successful PUT, and flush does not duplicate a saved snapshot', async () => {
  const response = deferred(); const calls = []
  const h = harness((path, options) => { calls.push({ path, options }); return response.promise })
  const a = attempt(); const answers = { q1: 2 }
  try {
    const hook = h.render(a, answers); const saving = hook.flush()
    assert.equal(h.render(a, answers).status, 'saving')
    assert.equal(calls[0].path, '/api/exams/owned-attempt/answers')
    assert.equal(calls[0].options.method, 'PUT')
    assert.deepEqual(JSON.parse(calls[0].options.body), { answers })
    response.resolve({}); await saving
    assert.equal(h.render(a, answers).status, 'saved')
    await hook.flush(); assert.equal(calls.length, 1)
  } finally { h.dispose() }
})

test('a changed answer during a pending save is serialized and flushed before completion', async () => {
  const first = deferred(); const second = deferred(); const calls = []
  const h = harness((path, options) => { calls.push(JSON.parse(options.body).answers); return calls.length === 1 ? first.promise : second.promise })
  const a = attempt()
  try {
    const saving = h.render(a, { q1: 0 }).flush()
    const updated = h.render(a, { q1: 1, q2: 3 }); const manualFlush = updated.flush()
    assert.equal(calls.length, 1)
    first.resolve({}); await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(calls, [{ q1: 0 }, { q1: 1, q2: 3 }])
    second.resolve({}); await Promise.all([saving, manualFlush])
    assert.equal(calls.length, 2)
  } finally { h.dispose() }
})

test('failed saves surface an error and explicit retry can recover', async () => {
  let fail = true
  const h = harness(() => fail ? Promise.reject(new Error('offline')) : Promise.resolve({}))
  const a = attempt(); const answers = { q1: 0 }
  try {
    const hook = h.render(a, answers)
    await assert.rejects(hook.flush(), /offline/)
    assert.equal(h.render(a, answers).status, 'error')
    assert.equal(h.render(a, answers).error, 'offline')
    fail = false; await hook.flush()
    assert.equal(h.render(a, answers).status, 'saved')
  } finally { h.dispose() }
})

test('expired attempts never PUT late answers', async () => {
  let calls = 0
  const h = harness(() => { calls++; return Promise.resolve({}) })
  try {
    const hook = h.render({ id: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString() }, { q1: 2 })
    await hook.flush(); assert.equal(calls, 0)
  } finally { h.dispose() }
})

test('unmount aborts a pending save', async () => {
  const response = deferred(); let signal
  const h = harness((path, options) => { signal = options.signal; return response.promise })
  const hook = h.render(attempt(), { q1: 2 }); const saving = hook.flush()
  h.dispose(); assert.equal(signal.aborted, true)
  response.resolve({}); await saving
})
