import { useState } from 'react'
import Recorder from '@/components/learning/Recorder'
import SpeechPlayer from '@/components/learning/SpeechPlayer'
import { Attribution, ChoiceExercise, LearningPage, Level, LevelSelect, ProgressButton, ResourceStatus, Source, useResource } from '@/components/learning/shared'

type Listening = { id: string; title: string; level: Level; transcript: string; translation: string; question: { prompt: string; options: string[]; answer: number; explanation: string }; source: Source }
function Lesson({ item }: { item: Listening }) {
  const [dictation, setDictation] = useState('')
  const [checked, setChecked] = useState(false)
  const normalize = (value: string) => value.normalize('NFKC').replace(/[\s。！？!?、,]/g, '')
  return <article className="panel space-y-6 p-5"><h2 className="text-2xl font-bold">{item.title}</h2><SpeechPlayer text={item.transcript} /><div className="space-y-3"><label className="block font-semibold" htmlFor="dictation">Nghe và chép lại</label><textarea id="dictation" className="field w-full" lang="ja" rows={4} maxLength={4000} value={dictation} onChange={event => { setDictation(event.target.value); setChecked(false) }} /><button className="btn" disabled={!dictation.trim()} onClick={() => setChecked(true)}>Đối chiếu bản chép</button>{checked && <div role="status"><p>{normalize(dictation) === normalize(item.transcript) ? 'Bản chép khớp nội dung (bỏ qua khoảng trắng, dấu câu).' : 'Bản chép khác nội dung mẫu. Tự đối chiếu bên dưới; đây không phải đánh giá phát âm.'}</p><p lang="ja">{item.transcript}</p></div>}</div><details><summary className="font-semibold cursor-pointer">Hiện transcript và bản dịch do tác giả biên soạn</summary><p lang="ja" className="whitespace-pre-wrap">{item.transcript}</p><p>{item.translation}</p></details><ChoiceExercise {...item.question} /><Recorder /><ProgressButton kind="listening" itemId={item.id} /><Attribution source={item.source} /></article>
}
export default function ListeningPage() {
  const [level, setLevel] = useState<Level>('N5')
  const [selected, setSelected] = useState('')
  const resource = useResource<{ items: Listening[] }>(`/api/content/listening?level=${level}`)
  const items = resource.data?.items ?? []
  const item = items.find(value => value.id === selected) ?? items[0]
  return <LearningPage title="Luyện nghe"><LevelSelect value={level} onChange={value => { setLevel(value); setSelected('') }} /><ResourceStatus {...resource} empty={!items.length} retry={resource.reload} />{item && <div className="grid gap-6 lg:grid-cols-[240px_1fr]"><nav className="panel space-y-2 self-start p-4" aria-label="Bài nghe">{items.map(value => <button className="btn block w-full text-left" key={value.id} aria-pressed={value.id === item.id} onClick={() => setSelected(value.id)}>{value.title}</button>)}</nav><Lesson key={item.id} item={item} /></div>}</LearningPage>
}
