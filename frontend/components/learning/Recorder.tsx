import { useEffect, useRef, useState } from 'react'
import { errorText } from './shared'

export default function Recorder() {
  const [supported, setSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [pending, setPending] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const mounted = useRef(false)
  const objectUrl = useRef('')
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requesting = useRef(false)
  function release() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (timeout.current) clearTimeout(timeout.current); timeout.current = null }
  useEffect(() => {
    mounted.current = true
    setSupported(typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined')
    return () => {
      mounted.current = false
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
      release(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
  }, [])
  async function start() {
    if (requesting.current || recording) return
    requesting.current = true; setPending(true); setError('')
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { acquired.getTracks().forEach(track => track.stop()); return }
      stream.current = acquired
      const instance = new MediaRecorder(acquired); recorder.current = instance
      const chunks: BlobPart[] = []
      instance.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data) }
      instance.onerror = () => { if (mounted.current) { setError('Ghi âm bị lỗi. Hãy thử lại.'); setRecording(false) } release() }
      instance.onstop = () => {
        release()
        if (!mounted.current) return
        setRecording(false)
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
        const blob = new Blob(chunks, { type: instance.mimeType })
        objectUrl.current = blob.size ? URL.createObjectURL(blob) : ''
        setUrl(objectUrl.current)
        if (!blob.size) setError('Chưa thu được âm thanh.')
      }
      instance.start(); setRecording(true)
      timeout.current = setTimeout(() => { if (instance.state !== 'inactive') instance.stop() }, 120000)
    } catch (reason) { release(); if (mounted.current) setError(errorText(reason)) }
    finally { requesting.current = false; if (mounted.current) setPending(false) }
  }
  return <section className="space-y-3"><h3 className="font-semibold">Thu và tự nghe lại</h3><p className="muted">Bản thu chỉ nằm trong phiên trình duyệt, tối đa 2 phút. Chưa có nhận dạng giọng nói (STT) hoặc điểm phát âm.</p>{!supported && <p className="notice">Ghi âm chưa khả dụng. Cần HTTPS/localhost và trình duyệt có MediaRecorder, quyền micro.</p>}<div className="flex gap-3"><button className="btn" disabled={!supported || recording || pending} onClick={start}>{pending ? 'Đang xin quyền micro…' : 'Bắt đầu thu'}</button><button className="btn" disabled={!recording} onClick={() => { if (recorder.current?.state === 'recording') recorder.current.stop() }}>Dừng thu</button></div>{recording && <p role="status">Đang ghi âm…</p>}{error && <p role="alert">{error}</p>}{url && <audio className="w-full" controls src={url} aria-label="Bản thu của bạn" />}</section>
}
