// Thin wrapper around fetch that unwraps the API's { data, meta } / { error } envelope.
async function request(path, params = {}, { signal } = {}) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const res = await fetch(url, { signal });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Unexpected response from server (${res.status})`);
  }
  if (!res.ok) throw new Error(body?.error?.message || `Request failed (${res.status})`);
  return body;
}

export function searchEvents(params, options) {
  return request('/api/events', params, options);
}

export function getEvent(id, options) {
  return request(`/api/events/${id}`, {}, options);
}

export function getCategories(options) {
  return request('/api/categories', {}, options);
}

export function geocode(q, options) {
  return request('/api/geocode', { q }, options);
}
