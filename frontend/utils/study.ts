import { Card } from '../types/learning'
export function normalizeJapanese(value: string): string { return value.normalize('NFKC').replace(/\s/g, '') }
export function acceptsAnswer(card: Card, answer: string): boolean {
  const normalized = normalizeJapanese(answer)
  return normalized.length > 0 && [card.entry.word, card.entry.reading].some(value => normalizeJapanese(value) === normalized)
}
export function choiceWords(card: Card, cards: Card[]): string[] {
  const alternatives = cards.filter(other => other.entry.word !== card.entry.word &&
    !other.entry.meanings.some(meaning => card.entry.meanings.includes(meaning)))
  const words = [...new Set(alternatives.map(other => other.entry.word))].slice(0, 3)
  if (!words.length) return []
  const position = Array.from(card.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % (words.length + 1)
  words.splice(position, 0, card.entry.word)
  return words
}
export function isDue(card: Card, now: number): boolean { return new Date(card.dueAt).getTime() <= now }
