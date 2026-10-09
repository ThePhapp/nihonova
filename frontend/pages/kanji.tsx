import { useState } from 'react'
import WritingPad from '@/components/learning/WritingPad'
import { Attribution, ChoiceExercise, LearningPage, Level, LevelSelect, ProgressButton, ResourceStatus, Source, useResource } from '@/components/learning/shared'

type Kanji = { id: string; character: string; onyomi: string[]; kunyomi: string[]; meaning: string; radical: string; strokes: number; level: Level; mnemonic: string; words: string[]; source: Source }
export default function KanjiPage() {
  const [level, setLevel] = useState<Level>('N5')
  const [selected, setSelected] = useState('')
  const resource = useResource<{ items: Kanji[] }>(`/api/content/kanji?level=${level}`)
  const items = resource.data?.items ?? []
  const item = items.find(value => value.id === selected) ?? items[0]
  const options = item ? [item.meaning, ...items.filter(value => value.id !== item.id && value.meaning !== item.meaning).map(value => value.meaning)].filter((value, index, values) => values.indexOf(value) === index).slice(0, 4).sort((a, b) => a.localeCompare(b, 'vi')) : []
  return <LearningPage title="Học Kanji"><LevelSelect value={level} onChange={value => { setLevel(value); setSelected('') }} /><ResourceStatus {...resource} empty={items.length === 0} retry={resource.reload} />{item && <div className="grid gap-6 lg:grid-cols-[240px_1fr]"><nav aria-label="Danh sách Kanji" className="panel flex flex-wrap gap-2 self-start p-4">{items.map(value => <button key={value.id} className="btn text-2xl" aria-pressed={value.id === item.id} onClick={() => setSelected(value.id)}>{value.character}</button>)}</nav><article key={item.id} className="panel space-y-6 p-5"><div className="flex flex-wrap items-center gap-6"><span lang="ja" className="text-7xl">{item.character}</span><div><h2 className="text-2xl font-bold">{item.meaning}</h2><p>{item.level} · Bộ {item.radical} · {item.strokes} nét</p><p>Âm On: {item.onyomi.join('、') || 'Chưa có'} · Âm Kun: {item.kunyomi.join('、') || 'Chưa có'}</p></div></div><p>Gợi nhớ: {item.mnemonic}</p><p lang="ja">Từ liên quan: {item.words.join('、') || 'Chưa có'}</p><WritingPad />{options.length > 1 ? <ChoiceExercise prompt={`Nghĩa của ${item.character} là gì?`} options={options} answer={options.indexOf(item.meaning)} explanation={`Nghĩa trong bài: ${item.meaning}.`} /> : <p className="notice">Chưa đủ chữ cùng cấp độ để tạo bài trắc nghiệm.</p>}<ProgressButton kind="kanji" itemId={item.id} /><Attribution source={item.source} /></article></div>}</LearningPage>
}
