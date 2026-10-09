export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message) }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Expected object')
  return value as Record<string, unknown>
}
export function text(value: unknown, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400, 'Invalid text')
  return value
}
export function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new HttpError(400, 'Invalid number')
  return value
}
export function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new HttpError(400, 'Invalid boolean')
  return value
}
export function level(value: unknown): string {
  if (typeof value !== 'string' || !/^N[1-5]$/.test(value)) throw new HttpError(400, 'Invalid JLPT level')
  return value
}
export function credentials(value: unknown) {
  const body = object(value)
  const email = text(body.email, 254).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email')
  const password = text(body.password, 72)
  const bytes = Buffer.byteLength(password, 'utf8')
  if (bytes < 8 || bytes > 72) throw new HttpError(400, 'Password must be 8–72 UTF-8 bytes')
  return { email, password }
}
