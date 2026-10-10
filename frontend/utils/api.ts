export const SESSION_EXPIRED = 'jlpt-session-expired'
export const TOKEN_KEY = 'jlpt-token'

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timer = setTimeout(abort, 15000)
  const headers = new Headers(options.headers)
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  try {
    const response = await fetch(`${base}${path}`, { ...options, credentials: options.credentials ?? 'include', headers, signal: controller.signal })
    const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register') && !path.startsWith('/api/auth/me') && typeof window !== 'undefined') {
        if (!token || localStorage.getItem(TOKEN_KEY) === token) {
          localStorage.removeItem(TOKEN_KEY)
          window.dispatchEvent(new Event(SESSION_EXPIRED))
        }
      }
      const details = body && typeof body === 'object' ? body as Record<string, unknown> : {}
      throw new ApiError(typeof details.error === 'string' ? details.error : `Yêu cầu thất bại (${response.status}).`,
        response.status, typeof details.code === 'string' ? details.code : undefined)
    }
    if (body === null && response.status !== 204) throw new ApiError('Máy chủ trả dữ liệu không hợp lệ.', response.status, 'INVALID_RESPONSE')
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted) throw new ApiError(options.signal?.aborted ? 'Yêu cầu đã hủy.' : 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 0, options.signal?.aborted ? 'ABORTED' : 'TIMEOUT')
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.', 0, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}
