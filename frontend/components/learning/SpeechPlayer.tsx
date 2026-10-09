import { useEffect, useRef, useState } from 'react'

export default function SpeechPlayer({ text }: { text: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [rate, setRate] = useState(1)
  const [repeat, setRepeat] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const update = () => setVoices(window.speechSynthesis.getVoices().filter(voice => /^ja(?:-|_)/i.test(voice.lang) || voice.lang === 'ja'))
    update(); window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => { generation.current++; window.speechSynthesis.cancel(); window.speechSynthesis.removeEventListener('voiceschanged', update) }
  }, [])
  useEffect(() => {
    generation.current++; setPlaying(false)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [text, rate, repeat, voiceName])
  function stop() { generation.current++; window.speechSynthesis.cancel(); setPlaying(false) }
  function play() {
    const voice = voices.find(value => value.voiceURI === voiceName) ?? voices[0]
    if (!voice) { setError('Trình duyệt chưa có giọng đọc tiếng Nhật. Cài giọng Nhật trong hệ điều hành hoặc dùng trình duyệt hỗ trợ.'); return }
    stop(); setError(''); setPlaying(true)
    const current = generation.current
    function speak(left: number) {
      if (current !== generation.current) return
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'; utterance.voice = voice; utterance.rate = rate
      utterance.onend = () => { if (current !== generation.current) return; if (left > 1) speak(left - 1); else setPlaying(false) }
      utterance.onerror = event => { if (current !== generation.current) return; setPlaying(false); setError(`Không phát được giọng đọc (${event.error}).`) }
      window.speechSynthesis.speak(utterance)
    }
    speak(repeat)
  }
  return <section className="space-y-3"><p className="notice">Âm thanh tạo bằng giọng tổng hợp của trình duyệt (TTS), không phải bản thu người bản ngữ.</p>{!voices.length && <p role="status">Chưa có giọng tiếng Nhật khả dụng; phát TTS đang bị vô hiệu hóa.</p>}<div className="flex flex-wrap items-center gap-4"><label>Giọng <select className="field" value={voiceName} onChange={event => setVoiceName(event.target.value)}><option value="">Giọng Nhật mặc định</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}</select></label><label>Tốc độ <select className="field" value={rate} onChange={event => setRate(Number(event.target.value))}>{[0.5, 0.75, 1, 1.25, 1.5].map(value => <option key={value} value={value}>{value}×</option>)}</select></label><label>Số lần <select className="field" value={repeat} onChange={event => setRepeat(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label><button className="btn btn-primary" disabled={!voices.length || playing} onClick={play}>Phát</button><button className="btn" disabled={!playing} onClick={stop}>Dừng</button></div>{playing && <p role="status">Đang phát…</p>}{error && <p role="alert">{error}</p>}</section>
}
