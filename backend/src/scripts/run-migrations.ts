import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pool } from '../config/db'
export async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(2026100901)')
    await client.query('CREATE TABLE IF NOT EXISTS jlpt_schema_versions (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const directory = path.resolve(__dirname, '../../src/migrations')
    for (const file of (await readdir(directory)).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
      const applied = await client.query('SELECT version FROM jlpt_schema_versions WHERE version=$1', [file])
      if (applied.rowCount) continue
      await client.query(await readFile(path.join(directory, file), 'utf8'))
      await client.query('INSERT INTO jlpt_schema_versions(version) VALUES($1)', [file])
    }
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
if (require.main === module) migrate().then(() => console.log('Additive migrations complete')).catch(() => {
  console.error('Migration failed; transaction rolled back. Check database connectivity and schema compatibility.')
  process.exitCode = 1
}).finally(() => pool.end())
