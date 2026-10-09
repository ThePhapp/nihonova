import Link from 'next/link'
import Layout from '../../components/layout/Layout'
export default function LegacyVocabDetailPage() {
  return <Layout><section className="panel space-y-4"><h1 className="page-heading">Tra từ trong từ điển mới</h1>
    <p>Mã từ của dữ liệu cũ không tương ứng với bộ từ điển mới. Dữ liệu cũ được giữ nguyên; hãy tra lại từ hoặc xem thẻ đã lưu trong tài khoản.</p>
    <Link className="btn btn-primary" href="/dictionary">Mở từ điển</Link>
  </section></Layout>
}
