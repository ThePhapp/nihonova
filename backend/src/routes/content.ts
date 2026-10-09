import { Router } from 'express'
import { kanji, grammar, reading, listening, Kanji, Grammar, Reading, Listening } from '../content'
import { InputError, normalizeSearch, parseQuery } from '../providers/dictionary'

const router = Router()
router.get('/:kind', (req, res) => {
  try {
    const { level, q } = parseQuery(req.query)
    const datasets: Record<string, Array<Kanji | Grammar | Reading | Listening>> = { kanji, grammar, reading, listening }
    const kind = req.params.kind
    if (!Object.prototype.hasOwnProperty.call(datasets, kind)) return res.status(404).json({ error: 'Không tìm thấy loại nội dung.' })
    if (kind === 'grammar') return res.json({ items: grammar.filter(item => (!level || item.level === level) && (!q || normalizeSearch(`${item.title} ${item.structure} ${item.explanation}`).includes(normalizeSearch(q)))) })
    const items = datasets[kind].filter(item => !level || item.level === level)
    res.json({ items })
  } catch (error) {
    if (error instanceof InputError) return res.status(400).json({ error: error.message, code: 'INVALID_QUERY' })
    res.status(503).json({ error: 'Nội dung tạm thời không khả dụng.' })
  }
})
export default router
