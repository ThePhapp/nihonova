import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
export const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000
} : {
  host: process.env.POSTGRES_HOST || process.env.PGHOST,
  port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
  user: process.env.POSTGRES_USER || process.env.PGUSER,
  password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD,
  database: process.env.POSTGRES_DB || process.env.PGDATABASE,
  connectionTimeoutMillis: 3000
})
pool.on('error', () => console.error('Database connection unavailable'))
