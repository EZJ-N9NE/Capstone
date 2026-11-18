import { HttpError } from './errorHandler.js';

function toNumber(value, name, { min, max } = {}) {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${name} must be a number`);
  if (min !== undefined && n < min) throw new HttpError(400, `${name} must be >= ${min}`);
  if (max !== undefined && n > max) throw new HttpError(400, `${name} must be <= ${max}`);
  return n;
}

function toDate(value, name) {
  if (value === undefined || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${name} must be a valid date`);
  return d.toISOString();
}

// Parses and validates the event search query string into req.search.
export function validateEventSearch(req, res, next) {
  try {
    const q = req.query;
    const lat = toNumber(q.lat, 'lat', { min: -90, max: 90 });
    const lng = toNumber(q.lng, 'lng', { min: -180, max: 180 });
    if ((lat === undefined) !== (lng === undefined)) {
      throw new HttpError(400, 'lat and lng must be provided together');
    }

    req.search = {
      lat,
      lng,
      radiusKm: toNumber(q.radius, 'radius', { min: 0.1, max: 500 }) ?? 25,
      q: typeof q.q === 'string' && q.q.trim() ? q.q.trim() : undefined,
      categoryId: toNumber(q.category, 'category', { min: 1 }),
      from: toDate(q.from, 'from'),
      to: toDate(q.to, 'to'),
      limit: toNumber(q.limit, 'limit', { min: 1, max: 200 }) ?? 50,
      offset: toNumber(q.offset, 'offset', { min: 0 }) ?? 0,
    };
    next();
  } catch (err) {
    next(err);
  }
}
