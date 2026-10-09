import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AuthProvider } from '../contexts/AuthContext'
import '../styles/globals.css'
export default function App({ Component, pageProps }: AppProps) {
  return <ThemeProvider><AuthProvider>
    <Head><title>JLPT Study — Học tiếng Nhật</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <Component {...pageProps} />
  </AuthProvider></ThemeProvider>
}
