export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export interface Source { name: string; url?: string; license: string }
export interface DictionaryEntry {
  id: string; word: string; reading: string; romaji: string; meanings: string[]
  partOfSpeech: string; level: Level | null; topic: string
  examples: Array<{ japanese: string; vietnamese: string }>
  source: Source; conjugations?: Record<string, string>; related?: string[]
  meaningLanguage?: 'vi' | 'en'
}
export interface DictionaryResponse { entries: DictionaryEntry[]; source: string; limited: boolean }
export interface Preferences { level: Level; targetLevel: Level; dailyMinutes: number; furigana: boolean; romaji: boolean }
export interface Card {
  id: string; entry: DictionaryEntry; dueAt: string; interval: number; ease: number
  repetitions: number; lastReviewed: string | null
}
export interface Activity { kind: 'kanji' | 'grammar' | 'reading' | 'listening'; itemId: string; minutes: number; completed: boolean; createdAt: string }
export interface ExamResult {
  id: string; level: Level; score: number; total: number
  bySkill: Record<string, { correct: number; total: number }>; createdAt: string
  answers: Array<{ questionId: string; answer: number; correctAnswer: number; correct: boolean; explanation: string }>
}
export interface LearningState {
  preferences: Preferences; cards: Card[]; history: string[]; activities: Activity[]; exams: ExamResult[]
  stats: { cards: number; due: number; mastered: number; streak: number; minutesToday: number; accuracy: number }
}
export const levels: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1']
