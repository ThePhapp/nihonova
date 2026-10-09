import { api, ApiError } from './api'
import { DictionaryResponse } from '../types/learning'
/** @deprecated Legacy name retained; searches the authorized local dictionary, never Mazii. */
export async function searchMaziiWord(keyword: string) {
  const response = await api<DictionaryResponse>(`/api/dictionary?q=${encodeURIComponent(keyword)}`)
  return response.entries
}
/** @deprecated Mazii integration is unavailable pending authorization. */
export async function getKanjiDetails(_kanji: string): Promise<never> {
  throw new ApiError('Tích hợp Mazii chưa được cấp quyền. Hãy dùng trang Kanji.', 503, 'PROVIDER_UNAVAILABLE')
}
/** @deprecated Mazii integration is unavailable pending authorization. */
export async function searchMaziiKanji(_keyword: string): Promise<never> {
  throw new ApiError('Tích hợp Mazii chưa được cấp quyền. Hãy dùng trang Kanji.', 503, 'PROVIDER_UNAVAILABLE')
}
