# Original starter content (T01)

`index.ts` exports the types `Level`, `Source`, `DictionaryEntry`, `Kanji`,
`Grammar`, `Reading`, `Listening`, `ExamQuestion`, and the values `words`,
`kanji`, `grammar`, `reading`, `listening`, `examQuestions`, `levels`,
`isLevel(value: unknown): value is Level`, `coverageNotice`.

Each of N5–N1 has 3 dictionary entries, 2 kanji, 2 grammar patterns,
1 reading passage, 1 listening script, and 5 independent exam practice items
(one each for vocabulary, kanji, grammar, reading, listening). Totals: 15 words,
10 kanji, 10 grammar patterns, 5 readings, 5 listening scripts, 25 questions.
All records include original-content source metadata. Japanese passages,
examples, questions, and Vietnamese explanations/translations are independently
authored for this starter set; no crawler output or external dataset is imported.
No external redistribution license is claimed.

Levels are suggested teaching placements, not official JLPT lists or expert
certification. This is limited starter coverage, not a complete curriculum or
an official exam simulation. Kanji readings and meanings are selected rather
than exhaustive; mnemonics are memory aids, not etymological claims.
Explicit conjugations exist only for 食べる, 急ぐ, 続ける; potential forms use
standard forms, and no conjugation engine is provided.

Question answers are zero-based option indices. Exam items are independent of
the lesson quizzes. Listening content is text for optional browser TTS, with
no recorded audio; exam scripts are supplied separately in optional `audioText`
for browser TTS while `prompt` contains only the visible question. Clients should
hide transcripts during the attempt. TTS practice does not reproduce the
conditions of the official listening test. Routes must omit answers and
explanations before exam submission. No providers, routes, schema or dependencies
are changed by this content module.
