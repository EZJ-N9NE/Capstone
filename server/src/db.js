import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Return NUMERIC columns as JS numbers instead of strings.
pg.types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://happnhub:happnhub@localhost:5432/happnhub',
});

export function query(text, params) {
  return pool.query(text, params);
}
