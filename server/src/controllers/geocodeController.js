import { HttpError } from '../middleware/errorHandler.js';

// Forward-geocodes a place name using Mapbox so the client can search by location text.
export async function geocode(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) throw new HttpError(400, 'q is required');

    const token = process.env.MAPBOX_TOKEN;
    if (!token) throw new HttpError(503, 'Geocoding is not configured (MAPBOX_TOKEN missing)');

    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
    );
    url.searchParams.set('access_token', token);
    url.searchParams.set('limit', '5');
    url.searchParams.set('types', 'place,postcode,locality,neighborhood,address,poi');

    const response = await fetch(url);
    if (!response.ok) throw new HttpError(502, `Geocoding failed (${response.status})`);
    const body = await response.json();

    const data = (body.features || []).map((f) => ({
      name: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
    }));
    res.json({ data, meta: { total: data.length } });
  } catch (err) {
    next(err);
  }
}
