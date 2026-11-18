import { useEffect, useState } from 'react';
import { searchEvents } from '../api/client.js';

// Fetches events whenever the search filters change. Stale requests are aborted.
export function useEvents(filters) {
  const [state, setState] = useState({ events: [], meta: null, loading: true, error: null });

  const { lat, lng, radius, q, category, from, to } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    searchEvents({ lat, lng, radius, q, category, from, to, limit: 100 }, { signal: controller.signal })
      .then(({ data, meta }) => setState({ events: data, meta, loading: false, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ events: [], meta: null, loading: false, error: err.message });
      });

    return () => controller.abort();
  }, [lat, lng, radius, q, category, from, to]);

  return state;
}
