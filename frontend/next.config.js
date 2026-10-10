const apiUrl = process.env.NEXT_PUBLIC_API_URL
const isDevelopment = process.env.NODE_ENV !== 'production'
let apiOrigin = ''
try { apiOrigin = apiUrl ? new URL(apiUrl).origin : '' } catch { throw new Error('NEXT_PUBLIC_API_URL must be an absolute URL or blank') }
const connectSources = ["'self'", ...(apiOrigin ? [apiOrigin] : []), ...(isDevelopment ? ['ws:'] : [])]
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src ${connectSources.join(' ')}`,
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join('; ')
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(process.env.ENABLE_HSTS === 'true' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/:path*`,
    }]
  },
}
module.exports = nextConfig
