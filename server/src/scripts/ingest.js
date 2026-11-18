// Pulls events from Ticketmaster around a point and upserts them into PostgreSQL.
// Usage: npm run ingest -- --lat 40.7608 --lng -111.8910 --radius 50 --pages 5
import 'dotenv/config';
import { pool } from '../db.js';
import { fetchEventsPage } from '../services/ticketmaster.js';

function parseArgs(argv) {
  const args = { lat: 40.7608, lng: -111.891, radius: 50, pages: 5 };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key in args) args[key] = Number(argv[i + 1]);
  }
  return args;
}

async function upsertCategory(client, category) {
  if (!category) return null;
  const { rows } = await client.query(
    `INSERT INTO categories (name, external_id) VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET external_id = COALESCE(categories.external_id, EXCLUDED.external_id)
      RETURNING id`,
    [category.name, category.externalId],
  );
  return rows[0].id;
}

async function upsertVenue(client, v) {
  const { rows } = await client.query(
    `INSERT INTO venues (external_id, name, address, city, state, postal_code, location)
      VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography)
      ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
        state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, location = EXCLUDED.location
      RETURNING id`,
    [v.externalId, v.name, v.address, v.city, v.state, v.postalCode, v.lng, v.lat],
  );
  return rows[0].id;
}

async function upsertEvent(client, e, venueId, categoryId) {
  await client.query(
    `INSERT INTO events (external_id, name, description, url, image_url, starts_at,
      price_min, price_max, currency, venue_id, category_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, url = EXCLUDED.url,
        image_url = EXCLUDED.image_url, starts_at = EXCLUDED.starts_at,
        price_min = EXCLUDED.price_min, price_max = EXCLUDED.price_max, currency = EXCLUDED.currency,
        venue_id = EXCLUDED.venue_id, category_id = EXCLUDED.category_id, updated_at = now()`,
    [e.externalId, e.name, e.description, e.url, e.imageUrl, e.startsAt,
      e.priceMin, e.priceMax, e.currency, venueId, categoryId],
  );
}

async function main() {
  const { lat, lng, radius, pages } = parseArgs(process.argv.slice(2));
  console.log(`Ingesting events within ${radius} km of (${lat}, ${lng}), up to ${pages} pages...`);

  let saved = 0;
  for (let page = 0; page < pages; page++) {
    const { events, totalPages } = await fetchEventsPage({ lat, lng, radiusKm: radius, page });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const e of events) {
        const categoryId = await upsertCategory(client, e.category);
        const venueId = await upsertVenue(client, e.venue);
        await upsertEvent(client, e, venueId, categoryId);
      }
      await client.query('COMMIT');
      saved += events.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    console.log(`  page ${page + 1}/${Math.min(pages, totalPages)}: ${events.length} events`);
    if (page + 1 >= totalPages) break;
    await new Promise((r) => setTimeout(r, 250)); // stay under the 5 req/s rate limit
  }

  console.log(`Done. Upserted ${saved} events.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
