export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Source {
  name: string;
  url?: string;
  license: string;
}

export interface Example {
  japanese: string;
  reading?: string;
  vietnamese: string;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meanings: string[];
  meaningLanguage: 'vi' | 'en';
  partOfSpeech: string;
  level: Level | null;
  topic: string;
  examples: Example[];
  source: Source;
  conjugations?: Record<string, string>;
  related?: string[];
}

export interface Kanji {
  id: string;
  character: string;
  onyomi: string[];
  kunyomi: string[];
  meaning: string;
  radical: string;
  strokes: number;
  level: Level;
  mnemonic: string;
  words: string[];
  source: Source;
}

export interface Grammar {
  id: string;
  title: string;
  structure: string;
  explanation: string;
  level: Level;
  examples: Example[];
  source: Source;
}

export interface Question {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Reading {
  id: string;
  title: string;
  level: Level;
  segments: Array<{ text: string; reading?: string; meaning?: string }>;
  translation: string;
  questions: Question[];
  source: Source;
}

export interface Listening {
  id: string;
  title: string;
  level: Level;
  transcript: string;
  translation: string;
  question: Question;
  source: Source;
}

export interface ExamQuestion extends Question {
  id: string;
  level: Level;
  skill: 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening';
  audioText?: string;
  source: Source;
}
