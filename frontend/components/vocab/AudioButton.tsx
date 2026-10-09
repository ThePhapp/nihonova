import { useEffect, useRef, useState } from 'react'
export default function AudioButton({ word }: { word: string }) {
  const [message, setMessage] = useState('')
  const [playing, setPlaying] = useState(false)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => () => {
    if (utterance.current && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])
  function speak() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setMessage('Trình duyệt không hỗ trợ đọc tiếng Nhật.'); return
    }
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ja'))
    if (!voice) { setMessage('Chưa có giọng tiếng Nhật. Hãy cài giọng tiếng Nhật trong hệ điều hành rồi thử lại.'); return }
    const speech = new SpeechSynthesisUtterance(word)
    utterance.current = speech; speech.lang = 'ja-JP'; speech.voice = voice
    speech.onend = () => { utterance.current = null; setPlaying(false) }
    speech.onerror = () => { utterance.current = null; setPlaying(false); setMessage('Không phát được giọng đọc. Hãy thử lại.') }
    window.speechSynthesis.cancel(); setMessage('Giọng đọc tổng hợp của trình duyệt.'); setPlaying(true)
    window.speechSynthesis.speak(speech)
  }
  return <div className="space-y-1">
    <button type="button" className="btn" onClick={speak} disabled={playing} aria-label={`Nghe cách đọc ${word}`}>{playing ? 'Đang đọc…' : 'Nghe tiếng Nhật'}</button>
    {message && <p className="muted text-xs" role="status">{message}</p>}
  </div>
}
