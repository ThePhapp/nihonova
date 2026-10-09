import { Router } from 'express'
import { DictionaryProvider, InputError, LicensedLocalDictionaryProvider, parseQuery } from '../providers/dictionary'
import { JotobaDictionaryProvider, JotobaError } from '../providers/jotoba'

export function createDictionaryRouter(provider: DictionaryProvider = new LicensedLocalDictionaryProvider(), jotoba = new JotobaDictionaryProvider()) {
  const router = Router()
  router.get('/', async (req, res) => {
    try {
      const selected = req.query.provider ?? 'local'
      if (selected !== 'local' && selected !== 'jotoba') throw new InputError('Provider phải là local hoặc jotoba.')
      const query = parseQuery(req.query)
      res.json(selected === 'jotoba' ? await jotoba.search(query, req.ip || req.socket.remoteAddress || 'unknown') : provider.search(query))
    }
    catch (error) {
      if (error instanceof InputError) return res.status(400).json({ error: error.message, code: 'INVALID_QUERY' })
      if (error instanceof JotobaError) return res.status(error.status).json({ error: error.message, code: error.code })
      res.status(503).json({ error: 'Từ điển tạm thời không khả dụng.', code: 'PROVIDER_UNAVAILABLE' })
    }
  })
  return router
}
export default createDictionaryRouter()
