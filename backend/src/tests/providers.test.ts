import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { AddressInfo } from 'net'
import { LicensedLocalDictionaryProvider, normalizeSearch, parseQuery } from '../providers/dictionary'
import { levels, words, kanji, grammar, reading, listening, examQuestions } from '../content'
import dictionaryRouter from '../routes/dictionary'
import contentRouter from '../routes/content'

const provider = new LicensedLocalDictionaryProvider()
test('every starter category covers all levels with source metadata and valid questions', () => {
  assert.equal(words.find(item => item.word === '食べる')?.conjugations?.te, '食べて')
  assert.equal(words.find(item => item.word === '急ぐ')?.conjugations?.te, '急いで')
  assert.equal(words.find(item => item.word === '続ける')?.conjugations?.potential, '続けられる')
  for (const level of levels) {
    for (const dataset of [words, kanji, grammar, reading, listening, examQuestions]) assert.ok(dataset.some(item => item.level === level), level)
    for (const skill of ['vocabulary', 'kanji', 'grammar', 'reading', 'listening']) assert.ok(examQuestions.some(item => item.level === level && item.skill === skill))
  }
  for (const dataset of [words, kanji, grammar, reading, listening]) {
    assert.equal(new Set(dataset.map(item => item.id)).size, dataset.length)
    for (const item of dataset) { assert.ok(item.source.name); assert.ok(item.source.license) }
  }
  for (const item of examQuestions) {
    assert.ok(item.answer >= 0 && item.answer < item.options.length && item.explanation && item.source.name && item.source.license)
    if (item.skill === 'listening') { assert.ok(item.audioText); assert.ok(!item.prompt.includes('女：')); assert.ok(!item.prompt.includes('男：')) }
  }
  for (const item of reading) for (const question of item.questions) assert.ok(question.answer >= 0 && question.answer < question.options.length)
  for (const item of listening) assert.ok(item.question.answer >= 0 && item.question.answer < item.question.options.length)
})
test('Japanese, kana, romaji and unaccented Vietnamese lookups return original entries', () => {
  for (const entry of words) {
    assert.equal(entry.meaningLanguage, 'vi')
    for (const query of [entry.word, entry.reading, entry.romaji, entry.meanings[0]]) {
      assert.ok(provider.search({ q: query }).entries.some(item => item.id === entry.id), query)
    }
  }
  assert.equal(normalizeSearch('ＴＡＢＥＲＵ'), 'taberu')
  assert.equal(normalizeSearch('ガクセイ'), normalizeSearch('がくせい'))
  assert.notEqual(normalizeSearch('がくせい'), normalizeSearch('かくせい'))
  assert.equal(normalizeSearch('ガ'), normalizeSearch('カ\u3099'))
  assert.notEqual(normalizeSearch('パ'), normalizeSearch('ハ'))
  assert.equal(normalizeSearch('Điện thoại'), 'dienthoai')
  const first = words[0]
  assert.ok(provider.search({ q: first.romaji.slice(0, -1) + 'x' }).entries.some(item => item.id === first.id))
})
test('bounded scalar query, level and topic validation', () => {
  for (const query of [{ q: 'a'.repeat(101) }, { q: ['猫'] }, { level: 'N6' }, { topic: {} }, { q: '\0' }]) assert.throws(() => parseQuery(query))
  for (const level of levels) assert.ok(provider.search({ level }).entries.every(item => item.level === level))
  const entry = words[0]
  assert.ok(provider.search({ topic: entry.topic }).entries.every(item => item.topic === entry.topic))
  assert.equal(provider.search({ q: 'xxxxxxxxxxxxxxxxxxx' }).entries.length, 0)
  assert.equal(provider.search({}).limited, true)
})
test('HTTP contracts and error statuses', async () => {
  const app = express(); app.use('/dictionary', dictionaryRouter); app.use('/content', contentRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const response = await fetch(`${base}/dictionary`)
    const body = await response.json() as { entries: unknown[]; source: string; limited: boolean }
    assert.ok(body.entries.length && body.source && body.limited)
    assert.equal((await fetch(`${base}/dictionary?level=N6`)).status, 400)
    assert.equal((await fetch(`${base}/dictionary?q=a&q=b`)).status, 400)
    for (const kind of ['kanji', 'grammar', 'reading', 'listening']) {
      const result = await fetch(`${base}/content/${kind}?level=N1`)
      assert.equal(result.status, 200)
      const data = await result.json() as { items: Array<{ level: string }> }
      assert.ok(data.items.length && data.items.every(item => item.level === 'N1'))
    }
    assert.equal((await fetch(`${base}/content/unknown`)).status, 404)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
