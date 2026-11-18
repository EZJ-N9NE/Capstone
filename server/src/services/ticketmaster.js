const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Fetches one page of events from the Ticketmaster Discovery API.
export async function fetchEventsPage({ lat, lng, radiusKm = 50, page = 0, size = 100, apiKey }) {
  const key = apiKey || process.env.TICKETMASTER_API_KEY;
  if (!key) throw new Error('TICKETMASTER_API_KEY is not set');

  const url = new URL(`${BASE_URL}/events.json`);
  url.searchParams.set('apikey', key);
  url.searchParams.set('latlong', `${lat},${lng}`);
  url.searchParams.set('radius', String(Math.round(radiusKm)));
  url.searchParams.set('unit', 'km');
  url.searchParams.set('size', String(size));
  url.searchParams.set('page', String(page));
  url.searchParams.set('sort', 'date,asc');

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ticketmaster request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const body = await res.json();
  return {
    events: (body._embedded?.events || []).map(normalizeEvent).filter(Boolean),
    totalPages: body.page?.totalPages ?? 0,
  };
}

function pickImage(images = []) {
  const wide = images.filter((i) => i.ratio === '16_9').sort((a, b) => b.width - a.width);
  return (wide[0] || images[0])?.url ?? null;
}

// Converts a raw Ticketmaster event into the shape the ingest script stores.
// Returns null for events without a usable venue location.
export function normalizeEvent(raw) {
  const venue = raw._embedded?.venues?.[0];
  const lng = Number(venue?.location?.longitude);
  const lat = Number(venue?.location?.latitude);
  if (!venue || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const segment = raw.classifications?.find((c) => c.primary)?.segment || raw.classifications?.[0]?.segment;
  const price = raw.priceRanges?.[0];
  const start = raw.dates?.start;

  return {
    externalId: raw.id,
    name: raw.name,
    description: raw.info || raw.pleaseNote || null,
    url: raw.url || null,
    imageUrl: pickImage(raw.images),
    startsAt: start?.dateTime || (start?.localDate ? `${start.localDate}T${start.localTime || '00:00:00'}` : null),
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? null,
    category:
      segment && segment.name && segment.name !== 'Undefined'
        ? { externalId: segment.id, name: segment.name }
        : null,
    venue: {
      externalId: venue.id,
      name: venue.name,
      address: venue.address?.line1 || null,
      city: venue.city?.name || null,
      state: venue.state?.stateCode || venue.state?.name || null,
      postalCode: venue.postalCode || null,
      lng,
      lat,
    },
  };
}
