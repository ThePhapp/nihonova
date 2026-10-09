import Link from 'next/link'
import ProtectedLayout from '../components/layout/ProtectedLayout'
import { useLearningState } from '../hooks/useLearningState'
const skills: Record<string, { label: string; href: string }> = {
  vocabulary: { label: 'Từ vựng', href: '/dictionary' }, kanji: { label: 'Kanji', href: '/kanji' },
  grammar: { label: 'Ngữ pháp', href: '/grammar' }, reading: { label: 'Đọc hiểu', href: '/reading' },
  listening: { label: 'Nghe hiểu', href: '/listening' },
}
function Dashboard() {
  const { data, loading, error, refresh } = useLearningState()
  if (loading && !data) return <p className="notice" role="status">Đang tải tiến độ học…</p>
  if (!data) return <div className="notice" role="alert">{error || 'Chưa tải được tiến độ.'} <button className="btn" type="button" onClick={() => void refresh()}>Thử lại</button></div>
  const { stats, preferences } = data
  const remaining = Math.max(0, preferences.dailyMinutes - stats.minutesToday)
  const progress = Math.min(100, Math.round(stats.minutesToday / preferences.dailyMinutes * 100))
  const exams = [...data.exams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const latest = exams[0]
  const analyses = latest ? Object.entries(latest.bySkill).filter(([, result]) => result.total > 0)
    .map(([skill, result]) => ({ skill, ...result, percent: Math.round(result.correct / result.total * 100) })) : []
  const weakest = [...analyses].sort((a, b) => a.percent - b.percent)[0]
  const activities = [...data.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const nextDue = data.cards.map(card => new Date(card.dueAt).getTime()).filter(Number.isFinite).sort((a, b) => a - b)[0]
  const counters = [['Thẻ đã lưu', stats.cards], ['Đến hạn', stats.due], ['Đã ghi nhớ', stats.mastered], ['Chuỗi ngày học', stats.streak]]
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="page-heading">Việc học của bạn</h1><p className="muted mt-2">Trình độ đã chọn {preferences.level} · Mục tiêu {preferences.targetLevel}</p></div>
      <button className="btn" type="button" disabled={loading} onClick={() => void refresh()}>{loading ? 'Đang cập nhật…' : 'Cập nhật tiến độ'}</button></div>
    {error && <p className="notice" role="alert">{error}</p>}
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{counters.map(([label, value]) => <div className="panel" key={label}><dt className="muted">{label}</dt><dd className="text-xl sm:text-2xl font-semibold tabular-nums mt-2">{value}</dd></div>)}</dl>
    <section className="panel space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">Mục tiêu hôm nay</h2><Link className="text-link" href="/settings">Chỉnh mục tiêu</Link></div>
      <p className="tabular-nums">{stats.minutesToday} / {preferences.dailyMinutes} phút đã ghi nhận · {remaining ? `Còn ${remaining} phút` : 'Đã đạt mục tiêu thời gian'}</p>
      <progress className="w-full h-3 accent-indigo-600" max={100} value={progress} aria-label="Tiến độ mục tiêu thời gian hôm nay" />
      <p className="muted">Thời gian là hoạt động đã được máy chủ ghi nhận; ôn thẻ được theo dõi riêng, không quy đổi thành phút giả.</p>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-primary" href={stats.due > 0 ? '/study' : '/dictionary'}>{stats.due > 0 ? `Ôn ${stats.due} thẻ đến hạn` : 'Tra và lưu từ mới'}</Link>
        <Link className="btn" href={weakest ? skills[weakest.skill]?.href || '/jlpt' : '/jlpt'}>{weakest ? `Luyện thêm ${skills[weakest.skill]?.label || weakest.skill}` : 'Làm bài luyện để xem kỹ năng'}</Link>
      </div>
      {nextDue !== undefined && <p className="muted">Hạn ôn sớm nhất: {new Date(nextDue).toLocaleString('vi-VN')}.</p>}
    </section>
    <section className="panel space-y-4">
      <h2 className="text-lg font-semibold">Kỹ năng từ bài luyện gần nhất</h2>
      {latest && analyses.length ? <>
        <p className="muted">Bài {latest.level} ngày {new Date(latest.createdAt).toLocaleDateString('vi-VN')}. Phân tích chỉ phản ánh bộ câu hỏi đã làm.</p>
        <div className="space-y-4">{analyses.map(result => <div key={result.skill}><p className="flex justify-between gap-3"><span>{skills[result.skill]?.label || result.skill}</span><span className="tabular-nums">{result.correct}/{result.total} · {result.percent}%</span></p>
          <progress className="w-full h-2 accent-indigo-600" max={result.total} value={result.correct} aria-label={`Kết quả ${skills[result.skill]?.label || result.skill}`} /></div>)}</div>
        {weakest && <p>Gợi ý từ kết quả thực tế: ưu tiên {skills[weakest.skill]?.label || weakest.skill} ({weakest.correct}/{weakest.total} câu đúng). Đây không phải đánh giá trình độ JLPT chính thức.</p>}
      </> : <p className="muted">Chưa có bài luyện đủ dữ liệu phân tích. <Link className="text-link" href="/jlpt">Làm bài luyện khởi đầu</Link>.</p>}
      {data.exams.some(exam => exam.total > 0) && <p className="muted">Độ chính xác bài luyện theo máy chủ: {stats.accuracy}%.</p>}
    </section>
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="panel space-y-4"><h2 className="text-lg font-semibold">Hoạt động gần đây</h2>
        {activities.length ? <ul className="space-y-3">{activities.slice(0, 8).map((activity, i) => <li key={`${activity.createdAt}:${i}`} className="space-y-1"><p>{skills[activity.kind]?.label || activity.kind} · {activity.completed ? 'Đã hoàn thành' : 'Đang học'} · {activity.minutes} phút</p>
          <p className="muted text-xs">{activity.itemId} · {new Date(activity.createdAt).toLocaleString('vi-VN')}</p></li>)}</ul> : <p className="muted">Chưa có hoạt động được lưu. Học một bài để bắt đầu theo dõi.</p>}
      </section>
      <section className="panel space-y-4"><h2 className="text-lg font-semibold">Lịch sử luyện JLPT</h2>
        {exams.length ? <ul className="space-y-3">{exams.slice(0, 5).map(exam => <li key={exam.id} className="flex flex-wrap justify-between gap-2"><span>{exam.level} · {new Date(exam.createdAt).toLocaleString('vi-VN')}</span><span className="tabular-nums">{exam.score}/{exam.total} câu đúng</span></li>)}</ul> : <p className="muted">Chưa có bài luyện đã nộp.</p>}
        <Link className="text-link" href="/jlpt">Mở luyện JLPT</Link>
      </section>
    </div>
    <section className="panel space-y-3"><h2 className="text-lg font-semibold">Từ đã tra gần đây</h2>
      {data.history.length ? <ul className="flex flex-wrap gap-3">{data.history.slice(0, 8).map((query, i) => <li key={i}><Link className="text-link" href={{ pathname: '/dictionary', query: { q: query } }}>{query}</Link></li>)}</ul> : <p className="muted">Lịch sử xuất hiện khi bạn bấm “Tra từ” trong từ điển.</p>}
    </section>
  </div>
}
export default function DashboardPage() { return <ProtectedLayout><Dashboard /></ProtectedLayout> }
