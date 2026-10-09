import Link from 'next/link'
import Layout from '../components/layout/Layout'
export default function Home() {
  return <Layout><div className="space-y-6">
    <div><h1 className="page-heading">Học tiếng Nhật, từng ngày</h1><p className="muted mt-2">Tra từ, lưu thẻ và ôn tập theo lịch của bạn.</p></div>
    <section className="panel space-y-4"><h2 className="text-lg font-semibold">Bắt đầu từ một từ mới</h2>
      <p>Nội dung khởi đầu có phạm vi giới hạn, không phải giáo trình JLPT N5–N1 đầy đủ. Nguồn được ghi tại từng mục.</p>
      <Link className="btn btn-primary" href="/dictionary">Mở từ điển</Link></section>
    <div className="grid-cards">{[['/study','Ôn tập','Ôn các thẻ đã lưu khi đến hạn.'],['/dashboard','Việc học hôm nay','Xem tiến độ thực tế và kế hoạch mỗi ngày.'],['/jlpt','Luyện JLPT','Luyện với bộ câu hỏi khởi đầu, xem giải thích sau khi nộp.']].map(([href,title,description]) =>
      <Link className="panel block space-y-2" href={href} key={href}><h2 className="text-base font-semibold">{title}</h2><p className="muted">{description}</p></Link>)}</div>
  </div></Layout>
}
