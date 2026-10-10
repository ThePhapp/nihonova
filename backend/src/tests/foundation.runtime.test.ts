import test from 'node:test'
import assert from 'node:assert/strict'
import { AddressInfo } from 'node:net'
test('HTTP runtime remains alive with offline DB, truthful readiness and bounded requests', async () => {
  process.env.DATABASE_URL = 'postgresql://offline_test:unused@127.0.0.1:1/offline_test'
  process.env.JWT_SECRET = 'foundation-runtime-tests-only-secret-32-bytes'
  delete process.env.FRONTEND_ORIGIN
  process.env.CORS_ORIGIN = 'http://localhost:3000, http://127.0.0.1:3000'
  const { createApp } = await import('../app.js')
  const { pool } = await import('../config/db.js')
  const server = createApp().listen(0)
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  try {
    const health = await fetch(base + '/api/health', { headers: { Origin: 'http://127.0.0.1:3000' } })
    assert.equal(health.status, 200)
    assert.equal(health.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000')
    assert.equal(health.headers.get('access-control-allow-credentials'), 'true')
    const ready = await fetch(base + '/api/health/ready')
    assert.equal(ready.status, 503)
    assert.deepEqual(await ready.json(), { error: 'Service temporarily unavailable' })
    const missing = await fetch(base + '/api/unknown')
    assert.equal(missing.status, 404)
    assert.deepEqual(await missing.json(), { error: 'Endpoint not found' })
    const huge = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x'.repeat(33000) }) })
    assert.equal(huge.status, 413)
    const blocked = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: 'jlpt_session=fake' } })
    assert.equal(blocked.status, 403)
    delete process.env.JWT_SECRET
    const unconfigured = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com', password: 'abcdefgh' }) })
    assert.equal(unconfigured.status, 503)
    assert.deepEqual(await unconfigured.json(), { error: 'Authentication is not configured' })
    let limited: Response | undefined
    for (let index = 0; index < 11; index++) limited = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(limited!.status, 429)
    assert.ok(Number(limited!.headers.get('retry-after')) > 0)
    assert.equal((await fetch(base + '/api/health')).status, 200)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await pool.end()
  }
})
