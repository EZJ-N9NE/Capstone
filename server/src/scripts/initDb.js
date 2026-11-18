// Loads db/init/*.sql (schema, then seed) into the database at DATABASE_URL.
// Usage (from server/):  $env:DATABASE_URL="<url>"; npm run db:init
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const client = new pg.Client({
  connectionString,
  // Render's external connections require SSL; local Docker Postgres does not.
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const initDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../db/init');
const files = (await readdir(initDir)).filter((f) => f.endsWith('.sql')).sort();

try {
  await client.connect();
  for (const file of files) {
    console.log(`Running ${file}...`);
    await client.query(await readFile(path.join(initDir, file), 'utf8'));
  }
  console.log('Database initialized.');
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
