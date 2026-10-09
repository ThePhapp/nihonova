import Link from 'next/link'
import { DictionaryEntry } from '../../types/learning'
import AudioButton from '../vocab/AudioButton'
export default function EntryCard({ entry, furigana = true, romaji = false, saved = false, busy = false, onSave, onRemove }: {
  entry: DictionaryEntry; furigana?: boolean; romaji?: boolean; saved?: boolean; busy?: boolean
  onSave?: () => void; onRemove?: () => void
}) {
  const safeUrl = entry.source.url && /^https?:\/\//.test(entry.source.url) ? entry.source.url : undefined
  return <article className="panel space-y-4">
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-lg font-semibold leading-loose" lang="ja">
        {furigana && entry.reading && entry.reading !== entry.word ? <ruby>{entry.word}<rp> (</rp><rt>{entry.reading}</rt><rp>)</rp></ruby> : entry.word}
      </h2><span className="badge shrink-0">{entry.level || 'Chưa rõ JLPT'}</span>
    </div>
    {romaji && entry.romaji && <p className="muted">{entry.romaji}</p>}
    <p className="muted">{entry.partOfSpeech}{entry.topic ? ` · ${entry.topic}` : ''} · Nghĩa {entry.meaningLanguage === 'en' ? 'tiếng Anh' : 'tiếng Việt'}</p>
    <ul className="list-disc pl-5" lang={entry.meaningLanguage === 'en' ? 'en' : 'vi'}>{entry.meanings.map((meaning, i) => <li key={i}>{meaning}</li>)}</ul>
    {entry.examples.length > 0 && <div className="space-y-3">{entry.examples.map((example, i) => <div key={i}><p lang="ja">{example.japanese}</p><p className="muted">{example.vietnamese}</p></div>)}</div>}
    {entry.conjugations && <dl>{Object.entries(entry.conjugations).map(([name, value]) => <div key={name} className="flex flex-wrap gap-2"><dt className="muted">{name}:</dt><dd lang="ja">{value}</dd></div>)}</dl>}
    {entry.related && entry.related.length > 0 && <p>Từ liên quan: {entry.related.map((word, i) => <Link className="text-link mr-2" key={i} href={{ pathname: '/dictionary', query: { q: word } }}>{word}</Link>)}</p>}
    <div className="flex flex-wrap items-start gap-2">
      <AudioButton word={entry.reading || entry.word} />
      {onSave && <button className="btn" type="button" disabled={busy || saved} onClick={onSave}>{busy ? 'Đang lưu…' : saved ? 'Đã lưu thẻ' : 'Lưu thẻ ôn tập'}</button>}
      {onRemove && <button className="btn" type="button" disabled={busy} onClick={onRemove}>{busy ? 'Đang gỡ…' : 'Gỡ thẻ đã lưu'}</button>}
    </div>
    <p className="muted text-xs">Nguồn: {safeUrl ? <a className="text-link" href={safeUrl} target="_blank" rel="noreferrer">{entry.source.name}</a> : entry.source.name} · {entry.source.license}</p>
  </article>
}
