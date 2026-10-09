import { expect, test } from '@playwright/test'
type Item = { id: string; level: string; character?: string; meaning?: string; title?: string }
test.use({
  baseURL: process.env.LEARNING_E2E_BASE_URL ?? 'http://localhost:3000',
  ...(process.env.LEARNING_E2E_VIEWPORT === 'mobile375' ? { viewport: { width: 375, height: 812 } } : {}),
})
const modules = [
  { kind: 'kanji', group: 'Kanji', navigation: 'Danh sách Kanji', index: 1 },
  { kind: 'grammar', group: 'Ngữ pháp', navigation: 'Bài ngữ pháp', index: 1 },
  { kind: 'reading', group: 'Đọc hiểu', navigation: 'Bài đọc', index: 0 },
]
for (const module of modules) {
  test(`public global search opens the exact N4 ${module.kind} target and preserves manual navigation`, async ({ page, request }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const response = await request.get(`/api/content/${module.kind}?level=N4`)
    expect(response.status()).toBe(200)
    const body: { items: Item[] } = await response.json()
    // Kanji and grammar select the second real N4 record; reading has one per level.
    expect(body.items.length).toBeGreaterThan(module.index)
    const target = body.items[module.index]
    const title = target.character ?? target.title
    if (!title) throw new Error('The real target must have a public title')
    await page.goto('/')
    const search = page.getByRole('search', { name: 'Tìm kiếm toàn ứng dụng', exact: true })
    await search.getByRole('textbox').fill(title)
    await search.getByRole('button', { name: 'Tìm', exact: true }).click()
    await expect(page).toHaveURL(/\/search\?q=/)
    const group = page.locator('section').filter({ has: page.getByRole('heading', { name: new RegExp(`^${module.group} \\(`) }) })
    const link = group.getByRole('link', { name: title, exact: true })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).not.toBeNull()
    const url = new URL(href!, 'http://localhost')
    expect(url.searchParams.get('level')).toBe('N4')
    expect(url.searchParams.get('item')).toBe(target.id)
    if (module.kind === 'grammar') expect(url.searchParams.get('q')).toBe(title)
    await link.click()
    const level = page.getByLabel(/^Cấp độ/)
    await expect(level).toHaveValue('N4')
    const navigation = page.getByRole('navigation', { name: module.navigation })
    await expect(navigation.getByRole('button', { name: title, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('article').getByRole('heading', { name: target.meaning ?? title, exact: true })).toBeVisible()
    if (module.kind === 'grammar') {
      const grammarSearch = page.getByRole('textbox', { name: 'Tìm ngữ pháp' })
      await expect(grammarSearch).toHaveValue(title)
      await grammarSearch.fill('')
      await grammarSearch.locator('..').getByRole('button', { name: 'Tìm', exact: true }).click()
      await page.goto(`/grammar?level=N4&item=${encodeURIComponent(target.id)}`)
      await expect(navigation.getByRole('button')).toHaveCount(body.items.length)
      await expect(navigation.getByRole('button', { name: title, exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    if (module.index === 1) {
      const firstTitle = body.items[0].character ?? body.items[0].title
      if (!firstTitle) throw new Error('The first real item must have a title')
      const first = navigation.getByRole('button', { name: firstTitle, exact: true })
      await first.click()
      await expect(first).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: /Bật giao diện/ }).click()
      await expect(first).toHaveAttribute('aria-pressed', 'true')
    }
    await level.selectOption('N5')
    await expect(level).toHaveValue('N5')
    await page.getByRole('button', { name: /Bật giao diện/ }).click()
    await expect(level).toHaveValue('N5')
    const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }))
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width)
    expect(errors).toEqual([])
  })
  test(`${module.kind} rejects array or invalid levels and unknown item IDs without resetting manual level`, async ({ page }) => {
    await page.goto(`/${module.kind}?level=N4&level=N1&item=missing-id&q=one&q=two`)
    const level = page.getByLabel(/^Cấp độ/)
    await expect(level).toHaveValue('N5')
    const navigation = page.getByRole('navigation', { name: module.navigation })
    await expect(navigation.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
    if (module.kind === 'grammar') await expect(page.getByRole('textbox', { name: 'Tìm ngữ pháp' })).toHaveValue('')
    await level.selectOption('N4')
    await page.getByRole('button', { name: /Bật giao diện/ }).click()
    await expect(level).toHaveValue('N4')
    await page.goto(`/${module.kind}?level=N9&item=missing-id`)
    await expect(level).toHaveValue('N5')
    await expect(navigation.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
  })
}
