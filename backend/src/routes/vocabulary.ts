// src/models/vocabulary.ts
import { pool } from '../config/db'
import { Vocabulary } from '../types'

export async function insertVocabulary(vocab: Vocabulary) {
  const query = `
    INSERT INTO vocabulary (
      word, kanji, hiragana, meanings, examples, jlpt_level
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `
  const values = [
    vocab.word,
    vocab.kanji,
    vocab.hiragana,
    JSON.stringify(vocab.meanings),
    JSON.stringify(vocab.examples),
    vocab.jlpt_level
  ]
  await pool.query(query, values)
}

export async function getVocabulary(level?: string, search?: string): Promise<Vocabulary[]> {
  let query = 'SELECT * FROM vocabulary'
  const values: string[] = []

  if (level) {
    query += ' WHERE jlpt_level = $1'
    values.push(level)
  }

  if (search) {
    query += values.length ? ' AND word ILIKE $2' : ' WHERE word ILIKE $1'
    values.push(`%${search}%`)
  }

  const res = await pool.query(query, values)
  return res.rows
}
