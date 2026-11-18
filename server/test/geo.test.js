// PostGIS distance and radius tests. Requires the database to be running (docker compose up -d).
// Each test runs inside a transaction that is rolled back, so no data is left behind.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';
import { buildSearchQuery } from '../src/controllers/eventsController.js';

let client;

before(async () => {
  client = await pool.connect();
});

after(async () => {
  client.release();
  await pool.end();
});

async function inRollback(fn) {
  await client.query('BEGIN');
  try {
    await fn();
  } finally {
    await client.query('ROLLBACK');
  }
}

async function insertVenueWithEvent(name, lng, lat) {
  const { rows } = await client.query(
    `INSERT INTO venues (external_id, name, location)
     VALUES ($1, $1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) RETURNING id`,
    [`test-${name}`, lng, lat],
  );
  await client.query(
    `INSERT INTO events (external_id, name, starts_at, venue_id) VALUES ($1, $1, now(), $2)`,
    [`test-event-${name}`, rows[0].id],
  );
}

function search(overrides) {
  return { radiusKm: 25, limit: 200, offset: 0, ...overrides };
}

test('ST_Distance between points 1 degree of latitude apart is about 111 km', async () => {
  const { rows } = await client.query(
    `SELECT ST_Distance(
       ST_SetSRID(ST_MakePoint(-111.9, 40.0), 4326)::geography,
       ST_SetSRID(ST_MakePoint(-111.9, 41.0), 4326)::geography
     ) AS meters`,
  );
  const km = rows[0].meters / 1000;
  assert.ok(km > 110.5 && km < 111.5, `expected ~111 km, got ${km}`);
});

test('points are stored as (longitude, latitude)', async () => {
  await inRollback(async () => {
    await insertVenueWithEvent('order', -111.891, 40.7608);
    const { rows } = await client.query(
      `SELECT ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
       FROM venues WHERE external_id = 'test-order'`,
    );
    assert.equal(rows[0].lng, -111.891);
    assert.equal(rows[0].lat, 40.7608);
  });
});

test('radius search only returns venues inside the radius', async () => {
  await inRollback(async () => {
    // Origin is on the equator, far from any seed data.
    const origin = { lng: 10, lat: 0 };
    await insertVenueWithEvent('near', 10, 0.05); // ~5.5 km north
    await insertVenueWithEvent('mid', 10, 0.15); // ~16.6 km north
    await insertVenueWithEvent('far', 10, 0.5); // ~55 km north

    const { text, params } = buildSearchQuery(search({ ...origin, radiusKm: 20 }));
    const { rows } = await client.query(text, params);
    const names = rows.map((r) => r.name);

    assert.deepEqual(names, ['test-event-near', 'test-event-mid']);
  });
});

test('radius search sorts results nearest first and reports distance', async () => {
  await inRollback(async () => {
    await insertVenueWithEvent('b', 20, 0.1);
    await insertVenueWithEvent('a', 20, 0.02);

    const { text, params } = buildSearchQuery(search({ lng: 20, lat: 0, radiusKm: 50 }));
    const { rows } = await client.query(text, params);

    assert.equal(rows[0].name, 'test-event-a');
    assert.ok(rows[0].distance_m < rows[1].distance_m);
    assert.ok(Math.abs(rows[0].distance_m - 2211) < 50, `got ${rows[0].distance_m} m`);
  });
});

test('search input is passed as parameters, never interpolated', () => {
  const malicious = "'; DROP TABLE events; --";
  const { text, params } = buildSearchQuery(search({ q: malicious, lng: 1, lat: 2 }));
  assert.ok(!text.includes(malicious));
  assert.ok(params.includes(malicious));
});
