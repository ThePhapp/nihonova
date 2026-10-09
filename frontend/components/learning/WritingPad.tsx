import { PointerEvent, useRef } from 'react'

export default function WritingPad() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<number | null>(null)
  function draw(event: PointerEvent<HTMLCanvasElement>, start: boolean) {
    const element = event.currentTarget
    const context = element.getContext('2d')
    if (!context) return
    const rect = element.getBoundingClientRect()
    const x = (event.clientX - rect.left) * element.width / rect.width
    const y = (event.clientY - rect.top) * element.height / rect.height
    context.strokeStyle = '#2563eb'; context.lineWidth = 6; context.lineCap = 'round'
    if (start) { context.beginPath(); context.moveTo(x, y) }
    context.lineTo(x, y); context.stroke()
  }
  return <div className="space-y-3"><h3 className="font-semibold">Bảng luyện viết</h3><canvas ref={canvas} width={480} height={480} aria-label="Bảng viết bằng chuột hoặc chạm" className="w-full max-w-sm touch-none rounded border bg-white" onPointerDown={event => { if (pointer.current !== null) return; pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); draw(event, true) }} onPointerMove={event => { if (pointer.current === event.pointerId) draw(event, false) }} onPointerUp={event => { if (pointer.current === event.pointerId) { pointer.current = null; event.currentTarget.releasePointerCapture(event.pointerId) } }} onPointerCancel={() => { pointer.current = null }} onLostPointerCapture={() => { pointer.current = null }} /><button className="btn" onClick={() => { const element = canvas.current; element?.getContext('2d')?.clearRect(0, 0, element.width, element.height) }}>Xóa nét viết</button><p className="muted">Tự đối chiếu với chữ mẫu. Bảng không nhận dạng chữ hay chấm thứ tự nét.</p></div>
}
