import { expect, Page, Response, test } from '@playwright/test'

type Kanji = { id: string; character: string; meaning: string; level: string }
type Grammar = { id: string; title: string; level: string; examples: { japanese: string }[] }
type Reading = { id: string; title: string; segments: { text: string; reading?: string }[]; translation: string; questions: { prompt: string; options: string[]; answer: number; explanation: string }[] }
type Listening = { title: string; transcript: string; question: { prompt: string; options: string[]; answer: number; explanation: string } }
type Entry = { word: string; reading: string; meanings: string[] }

test.use({
  baseURL: process.env.LEARNING_E2E_BASE_URL ?? 'http://localhost:3000',
  ...(process.env.LEARNING_E2E_VIEWPORT === 'mobile375' ? { viewport: { width: 375, height: 812 } } : {}),
})

const browserErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
})
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'No uncaught exceptions or console errors').toEqual([])
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }))
  expect(dimensions.scroll, 'No horizontal page overflow').toBeLessThanOrEqual(dimensions.width)
})

function contentResponse(page: Page, kind: string, level: string, query?: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === `/api/content/${kind}` && url.searchParams.get('level') === level && (query === undefined || url.searchParams.get('q') === query)
  })
}
async function items<T>(response: Response): Promise<T[]> {
  expect(response.status(), `Real content endpoint ${response.url()} must be mounted`).toBe(200)
  const body: { items: T[] } = await response.json()
  expect(Array.isArray(body.items)).toBe(true)
  return body.items
}
async function open<T>(page: Page, kind: string): Promise<T[]> {
  const response = contentResponse(page, kind, 'N5')
  await page.goto(`/${kind}`)
  await expect(page.getByText(/Bộ nội dung khởi đầu giới hạn/)).toBeVisible()
  return items<T>(await response)
}

test('kanji level changes show only real matching content or an honest empty state', async ({ page }) => {
  const initial = await open<Kanji>(page, 'kanji')
  expect(initial.length).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: initial[0].meaning, exact: true })).toBeVisible()
  for (const level of ['N4', 'N1', 'N5']) {
    const response = contentResponse(page, 'kanji', level)
    await page.getByLabel(/^Cấp độ/).selectOption(level)
    const current = await items<Kanji>(await response)
    expect(current.every(item => item.level === level)).toBe(true)
    if (current.length) {
      const list = page.getByRole('navigation', { name: 'Danh sách Kanji' })
      await expect(list.getByRole('button')).toHaveCount(current.length)
      await expect(page.getByRole('heading', { name: current[0].meaning, exact: true })).toBeVisible()
      await expect(list.getByRole('button', { name: current[0].character, exact: true })).toHaveAttribute('aria-pressed', 'true')
    } else {
      await expect(page.getByText('Chưa có nội dung cho lựa chọn này.')).toBeVisible()
      await expect(page.locator('canvas')).toHaveCount(0)
    }
  }
})

test('writing pointer strokes really draw and clear the canvas without recognition claims', async ({ page }) => {
  await open<Kanji>(page, 'kanji')
  const canvas = page.getByLabel('Bảng viết bằng chuột hoặc chạm')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) throw new Error('Writing pad is not visible')
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, { steps: 8 })
  await page.mouse.up()
  const painted = () => canvas.evaluate(element => {
    const target = element as HTMLCanvasElement
    const pixels = target.getContext('2d')?.getImageData(0, 0, target.width, target.height).data
    return Boolean(pixels?.some((value, index) => index % 4 === 3 && value > 0))
  })
  await expect.poll(painted).toBe(true)
  await page.getByRole('button', { name: 'Xóa nét viết' }).click()
  await expect.poll(painted).toBe(false)
  await expect(page.getByText('Bảng không nhận dạng chữ hay chấm thứ tự nét.', { exact: false })).toBeVisible()
})

test('grammar level, search, and example comparison use server content', async ({ page }) => {
  const initial = await open<Grammar>(page, 'grammar')
  expect(initial.length).toBeGreaterThan(0)
  const n4 = contentResponse(page, 'grammar', 'N4')
  await page.getByLabel(/^Cấp độ/).selectOption('N4')
  const current = await items<Grammar>(await n4)
  if (current.length) await expect(page.locator('article').getByRole('heading', { name: current[0].title, exact: true })).toBeVisible()
  else await expect(page.getByText('Chưa có nội dung cho lựa chọn này.')).toBeVisible()
  const n5 = contentResponse(page, 'grammar', 'N5')
  await page.getByLabel(/^Cấp độ/).selectOption('N5'); await n5
  const query = initial[0].title
  const searched = contentResponse(page, 'grammar', 'N5', query)
  await page.getByRole('textbox', { name: 'Tìm ngữ pháp' }).fill(query)
  await page.getByRole('button', { name: 'Tìm', exact: true }).click()
  const results = await items<Grammar>(await searched)
  expect(results.length).toBeGreaterThan(0)
  await expect(page.getByRole('navigation', { name: 'Bài ngữ pháp' }).getByRole('button')).toHaveCount(results.length)
  expect(results[0].examples.length).toBeGreaterThan(0)
  await page.getByRole('textbox', { name: 'Câu của bạn' }).fill(results[0].examples[0].japanese)
  await page.getByRole('button', { name: 'Đối chiếu với ví dụ' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Khớp câu mẫu.' })).toBeVisible()
})

test('reading toggles furigana, answers a real quiz, and looks up a real starter word', async ({ page, request }) => {
  const readings = await open<Reading>(page, 'reading')
  expect(readings.length).toBeGreaterThan(0)
  const reading = readings[0]
  const rubyCount = reading.segments.filter(segment => segment.reading).length
  await expect(page.locator('article ruby')).toHaveCount(rubyCount)
  await page.getByLabel('Hiện furigana').uncheck()
  await expect(page.locator('article ruby')).toHaveCount(0)
  await page.getByLabel('Hiện furigana').check()
  await expect(page.locator('article ruby')).toHaveCount(rubyCount)
  const font = page.locator('article > div[lang="ja"]')
  await page.getByRole('slider', { name: /^Cỡ chữ/ }).fill('30')
  await expect(font).toHaveCSS('font-size', '30px')
  await page.getByText('Bản dịch tiếng Việt do tác giả nội dung biên soạn', { exact: true }).click()
  await expect(page.locator('details').getByText(reading.translation, { exact: true })).toBeVisible()
  expect(reading.questions.length).toBeGreaterThan(0)
  const question = reading.questions[0]
  const exercise = page.locator('fieldset').first()
  await exercise.getByRole('radio').nth(question.answer).check()
  await exercise.getByRole('button', { name: 'Kiểm tra bài luyện' }).click()
  await expect(exercise.getByText('Đúng.', { exact: true })).toBeVisible()
  await expect(exercise.getByText(question.explanation, { exact: true })).toBeVisible()
  const dictionaryResponse = await request.get('/api/dictionary?q=')
  expect(dictionaryResponse.status()).toBe(200)
  const dictionary: { entries: Entry[] } = await dictionaryResponse.json()
  const entry = dictionary.entries.find(value => reading.segments.some(segment => segment.text.includes(value.word))) ?? dictionary.entries[0]
  expect(entry).toBeDefined()
  const lookupResponse = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/dictionary' && url.searchParams.get('q') === entry.word })
  await page.getByRole('textbox', { name: 'Từ cần tra' }).fill(entry.word)
  await page.getByRole('button', { name: 'Tra từ', exact: true }).click()
  expect((await lookupResponse).status()).toBe(200)
  const panel = page.getByRole('complementary', { name: 'Kết quả từ điển' })
  await expect(panel.getByText(`${entry.word}【${entry.reading}】`, { exact: true })).toBeVisible()
  await expect(panel.getByText(entry.meanings.join('; '), { exact: true })).toBeVisible()
})

test('unsupported listening capabilities stay disabled and dictation stays a text comparison', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
  })
  const lessons = await open<Listening>(page, 'listening')
  expect(lessons.length).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Phát', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Bắt đầu thu', exact: true })).toBeDisabled()
  await expect(page.getByText('Chưa có giọng tiếng Nhật khả dụng; phát TTS đang bị vô hiệu hóa.')).toBeVisible()
  await expect(page.getByText(/Ghi âm chưa khả dụng/)).toBeVisible()
  await expect(page.getByText(/Chưa có nhận dạng giọng nói \(STT\) hoặc điểm phát âm/)).toBeVisible()
  await page.getByRole('textbox', { name: 'Nghe và chép lại' }).fill(lessons[0].transcript)
  await page.getByRole('button', { name: 'Đối chiếu bản chép' }).click()
  await expect(page.getByText('Bản chép khớp nội dung (bỏ qua khoảng trắng, dấu câu).', { exact: true })).toBeVisible()
})

test('unconfigured tutor reports the real provider reason and never sends a paid request', async ({ page }) => {
  const tutorRequests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/ai/tutor') tutorRequests.push(request.method()) })
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/ai/status')
  await page.goto('/tutor')
  const statusResponse = await response
  expect(statusResponse.status(), 'AI status route must be mounted before this test').toBe(200)
  const status: { available: boolean; provider: string; reason?: string } = await statusResponse.json()
  expect(status.available, 'This disabled-provider test requires the configured no-credentials environment').toBe(false)
  await expect(page.getByText(`Nhà cung cấp: ${status.provider}`, { exact: true })).toBeVisible()
  await expect(page.getByText(`Gia sư đang tắt: ${status.reason || 'Chưa có cấu hình nhà cung cấp khả dụng.'}`, { exact: true })).toBeVisible()
  await expect(page.getByText(/AI có thể sai/)).toBeVisible()
  await page.getByRole('textbox', { name: 'Câu hỏi', exact: true }).fill('Giải thích cách dùng に.')
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Cho phép gửi ngữ cảnh hội thoại')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Xóa hội thoại trong phiên' })).toBeDisabled()
  expect(tutorRequests).toEqual([])
})
