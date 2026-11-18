import { query } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';

const EVENT_COLUMNS = `
  e.id, e.name, e.description, e.url, e.image_url, e.starts_at,
  e.price_min, e.price_max, e.currency,
  c.id AS category_id, c.name AS category_name,
  v.id AS venue_id, v.name AS venue_name, v.address, v.city, v.state, v.postal_code,
  ST_X(v.location::geometry) AS lng,
  ST_Y(v.location::geometry) AS lat
`;

function toEvent(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    imageUrl: row.image_url,
    startsAt: row.starts_at,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency,
    distanceKm: row.distance_m != null ? Math.round(row.distance_m / 10) / 100 : null,
    category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
    venue: row.venue_id
      ? {
          id: row.venue_id,
          name: row.venue_name,
          address: row.address,
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          lat: row.lat,
          lng: row.lng,
        }
      : null,
  };
}

// Builds a parameterized search query. User input only ever goes into `params`.
export function buildSearchQuery(search) {
  const params = [];
  const where = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  let distanceSelect = 'NULL::float AS distance_m';
  let orderBy = 'e.starts_at ASC NULLS LAST, e.id ASC';

  if (search.lat !== undefined && search.lng !== undefined) {
    // PostGIS points are (longitude, latitude).
    const point = `ST_SetSRID(ST_MakePoint(${add(search.lng)}, ${add(search.lat)}), 4326)::geography`;
    distanceSelect = `ST_Distance(v.location, ${point}) AS distance_m`;
    where.push(`ST_DWithin(v.location, ${point}, ${add(search.radiusKm * 1000)})`);
    orderBy = `distance_m ASC, e.starts_at ASC NULLS LAST, e.id ASC`;
  }

  if (search.q) {
    const tsq = `websearch_to_tsquery('english', ${add(search.q)})`;
    where.push(`e.search_vector @@ ${tsq}`);
  }
  if (search.categoryId) where.push(`e.category_id = ${add(search.categoryId)}`);
  if (search.from) where.push(`e.starts_at >= ${add(search.from)}`);
  if (search.to) where.push(`e.starts_at <= ${add(search.to)}`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = add(search.limit);
  const offset = add(search.offset);

  const text = `
    SELECT ${EVENT_COLUMNS}, ${distanceSelect}, COUNT(*) OVER() AS total_count
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    LEFT JOIN categories c ON c.id = e.category_id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;
  return { text, params };
}

export async function searchEvents(req, res, next) {
  try {
    const { text, params } = buildSearchQuery(req.search);
    const { rows } = await query(text, params);
    const total = rows.length ? Number(rows[0].total_count) : 0;
    res.json({
      data: rows.map(toEvent),
      meta: {
        total,
        limit: req.search.limit,
        offset: req.search.offset,
        radiusKm: req.search.lat !== undefined ? req.search.radiusKm : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEventById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Event id must be a positive integer');

    const { rows } = await query(
      `SELECT ${EVENT_COLUMNS}, NULL::float AS distance_m
       FROM events e
       LEFT JOIN venues v ON v.id = e.venue_id
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.id = $1`,
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Event not found');
    res.json({ data: toEvent(rows[0]), meta: {} });
  } catch (err) {
    next(err);
  }
}
