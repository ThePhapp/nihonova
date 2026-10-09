import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { AddressInfo } from 'net'
import { EventEmitter } from 'events'
import { IncomingMessage } from 'http'
import { request } from 'https'
import { JotobaDictionaryProvider, JotobaError, parseJotoba, createJotobaHttp } from '../providers/jotoba'
import { createDictionaryRouter } from '../routes/dictionary'
import { LicensedLocalDictionaryProvider } from '../providers/dictionary'

const payload = () => ({ words: [{ reading: { kana: 'ねこ', kanji: '猫' }, common: true,
  senses: [{ language: 'English', glosses: ['cat', 'feline'], pos: [{ Noun: 'Normal' }] }] }] })
const body = () => JSON.stringify(payload())
test('verified English schema preserves attribution with unknown level and no invented examples', () => {
  const entries = parseJotoba(body())
  assert.equal(entries[0].word, '猫'); assert.equal(entries[0].reading, 'ねこ')
  assert.equal(entries[0].level, null); assert.equal(entries[0].topic, '')
  assert.equal(entries[0].meaningLanguage, 'en'); assert.equal(entries[0].romaji, '')
  assert.deepEqual(entries[0].examples, []); assert.deepEqual(entries[0].meanings, ['cat', 'feline'])
  assert.match(entries[0].partOfSpeech, /Noun/)
  assert.match(entries[0].source.name, /EDRDG/); assert.match(entries[0].source.license, /4.0/)
  assert.equal(entries[0].id, parseJotoba(body())[0].id)
  const stringPos = payload(); stringPos.words[0].senses[0].pos = ['Noun'] as unknown as Array<{ Noun: string }>
  assert.equal(parseJotoba(JSON.stringify(stringPos))[0].partOfSpeech, 'Noun')
  const nestedPos = payload(); nestedPos.words[0].senses[0].pos = [{ Verb: { Ichidan: null } }] as unknown as Array<{ Noun: string }>
  assert.match(parseJotoba(JSON.stringify(nestedPos))[0].partOfSpeech, /Ichidan/)
})
test('malformed, oversized and wrong-language payloads cannot invent glosses', () => {
  for (const text of ['bad JSON', '{}', '{"words":{}}', 'x'.repeat(262145),
    JSON.stringify({ words: [{ reading: { kana: 'ねこ' }, senses: [{ language: 'English', glosses: [1], pos: [] }] }] }),
    JSON.stringify({ words: [{ reading: { kana: 'ねこ' }, senses: [{ language: 'English', glosses: ['cat'], pos: [42] }] }] })]) assert.throws(() => parseJotoba(text), JotobaError)
  const data = payload(); data.words[0].senses[0].language = 'German'
  assert.deepEqual(parseJotoba(JSON.stringify(data)), [])
})
test('short cache TTL, bounded retry and fair-use limits', async () => {
  let calls = 0; let now = 100000
  const provider = new JotobaDictionaryProvider(async q => { assert.equal(q, '猫'); calls++; return { status: calls === 1 ? 503 : 200, body: body() } }, () => now)
  assert.ok((await provider.search({ q: '猫' }, 'a')).entries.length)
  assert.equal(calls, 2)
  await provider.search({ q: '猫' }, 'b'); assert.equal(calls, 2)
  now += 60001; await provider.search({ q: '猫' }, 'b'); assert.equal(calls, 3)
  for (let i = 1; i < 10; i++) await provider.search({ q: '猫' }, 'b')
  await assert.rejects(provider.search({ q: '猫' }, 'b'), (error: unknown) => error instanceof JotobaError && error.status === 429)
  let failedCalls = 0
  const failed = new JotobaDictionaryProvider(async () => { failedCalls++; throw new Error('private upstream stack') })
  await assert.rejects(failed.search({ q: '猫' }, 'a'), (error: unknown) => error instanceof JotobaError && !error.message.includes('stack'))
  assert.equal(failedCalls, 2)
  let limitedCalls = 0
  const limited = new JotobaDictionaryProvider(async () => { limitedCalls++; return { status: 429, body: 'private upstream' } })
  await assert.rejects(limited.search({ q: '猫' }, 'a'), JotobaError); assert.equal(limitedCalls, 1)
})
test('rejects unsupported filters, invalid query and limits concurrent network calls', async () => {
  const pending: Array<(value: { status: number; body: string }) => void> = []
  const provider = new JotobaDictionaryProvider(() => new Promise(resolve => pending.push(resolve)))
  for (const query of [{ q: '' }, { q: 'x'.repeat(101) }, { q: '猫', level: 'N5' as const }, { q: '猫', topic: 'animals' }]) await assert.rejects(provider.search(query, 'a'))
  const first = provider.search({ q: '猫' }, 'a'); const second = provider.search({ q: '犬' }, 'b')
  await assert.rejects(provider.search({ q: '水' }, 'c'), (error: unknown) => error instanceof JotobaError && error.status === 429)
  for (const resolve of pending) resolve({ status: 200, body: body() })
  await Promise.all([first, second])
})
test('HTTP adapter uses verified schema, bounded response and transport failures', async () => {
  for (const mode of ['success', 'large', 'aborted', 'error', 'timeout']) {
    const send = ((_url: unknown, options: { method: string; headers: Record<string, string> }, callback: (res: IncomingMessage) => void) => {
      assert.equal(_url, 'https://jotoba.de/api/search/words'); assert.equal(options.method, 'POST')
      const req = Object.assign(new EventEmitter(), { destroy() { return this }, end(raw: string) {
        assert.deepEqual(JSON.parse(raw), { query: '猫', language: 'English', no_english: false })
        if (mode === 'timeout') return
        setImmediate(() => {
          if (mode === 'error') { req.emit('error', new Error('private')); return }
          const res = Object.assign(new EventEmitter(), { statusCode: 200, destroy() { return this } })
          callback(res as unknown as IncomingMessage)
          if (mode === 'aborted') res.emit('aborted')
          else { res.emit('data', Buffer.from(mode === 'large' ? 'x'.repeat(262145) : body())); res.emit('end') }
        })
      } })
      return req
    }) as unknown as typeof request
    const result = createJotobaHttp(send)('猫')
    if (mode === 'success') assert.equal((await result).status, 200)
    else await assert.rejects(result, JotobaError)
  }
})
test('optional HTTP query selects Jotoba; local stays default and invalid provider rejected', async () => {
  let calls = 0
  const jotoba = new JotobaDictionaryProvider(async () => { calls++; return { status: 200, body: body() } })
  const app = express(); app.use('/dictionary', createDictionaryRouter(new LicensedLocalDictionaryProvider(), jotoba))
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/dictionary`
  try {
    assert.equal((await fetch(base)).status, 200); assert.equal(calls, 0)
    const remote = await fetch(base + '?provider=jotoba&q=%E7%8C%AB')
    assert.equal(remote.status, 200)
    const value = await remote.json() as { entries: Array<{ meaningLanguage: string; level: unknown }> }
    assert.equal(value.entries[0].meaningLanguage, 'en'); assert.equal(value.entries[0].level, null)
    assert.equal(calls, 1)
    for (const query of ['?provider=unknown', '?provider=jotoba', '?provider=jotoba&q=cat&level=N5', '?provider=jotoba&provider=local&q=cat']) assert.equal((await fetch(base + query)).status, 400)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
