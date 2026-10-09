import { Level, Source } from './learning'
export interface KanjiItem { id: string; character: string; onyomi: string[]; kunyomi: string[]; meaning: string; level: Level; source: Source }
export interface GrammarItem { id: string; title: string; structure: string; explanation: string; level: Level; source: Source }
export interface ReadingItem { id: string; title: string; level: Level; translation: string; segments: Array<{ text: string; reading?: string; meaning?: string }>; source: Source }
export interface ListeningItem { id: string; title: string; level: Level; transcript: string; translation: string; source: Source }
export type ContentKind = 'kanji' | 'grammar' | 'reading' | 'listening'
export interface ContentSummary { id: string; kind: ContentKind; title: string; searchText: string; level: Level; source: Source }
