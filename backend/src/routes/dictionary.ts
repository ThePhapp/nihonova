import { Router } from 'express'
import { DictionaryProvider, InputError, LicensedLocalDictionaryProvider, parseQuery } from '../providers/dictionary'

export function createDictionaryRouter(provider: DictionaryProvider = new LicensedLocalDictionaryProvider()) {
  const router = Router()
  router.get('/', (req, res) => {
    try { res.json(provider.search(parseQuery(req.query))) }
    catch (error) {
      if (error instanceof InputError) return res.status(400).json({ error: error.message, code: 'INVALID_QUERY' })
      res.status(503).json({ error: 'Từ điển tạm thời không khả dụng.', code: 'PROVIDER_UNAVAILABLE' })
    }
  })
  return router
}
export default createDictionaryRouter()
