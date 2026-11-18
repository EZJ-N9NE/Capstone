import { useMemo, useState } from 'react';
import SearchControls from './components/SearchControls.jsx';
import ResultsList from './components/ResultsList.jsx';
import EventDetails from './components/EventDetails.jsx';
import EventMap from './components/EventMap.jsx';
import { useEvents } from './hooks/useEvents.js';

const DEFAULT_LOCATION = { lat: 40.7608, lng: -111.891, name: 'Salt Lake City, UT' };

// Date inputs give YYYY-MM-DD in the user's local time; send full-day bounds as ISO strings.
function dayStart(date) {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}
function dayEnd(date) {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
}

export default function App() {
  const [filters, setFilters] = useState({
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    radius: 25,
    q: '',
    category: undefined,
    from: undefined,
    to: undefined,
  });
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION.name);
  const [selectedId, setSelectedId] = useState(null);

  const apiFilters = useMemo(
    () => ({ ...filters, from: dayStart(filters.from), to: dayEnd(filters.to) }),
    [filters],
  );
  const { events, meta, loading, error } = useEvents(apiFilters);
  const selectedEvent = events.find((e) => e.id === selectedId) || null;

  function updateFilters(patch, newLocationName) {
    setFilters((f) => ({ ...f, ...patch }));
    if (newLocationName) setLocationName(newLocationName);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>HappnHub</h1>
        <span className="tagline">Find what's happening near you</span>
      </header>
      <main className="layout">
        <aside className="sidebar">
          <SearchControls filters={filters} locationName={locationName} onChange={updateFilters} />
          {selectedEvent ? (
            <EventDetails event={selectedEvent} onClose={() => setSelectedId(null)} />
          ) : (
            <ResultsList
              events={events}
              meta={meta}
              loading={loading}
              error={error}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </aside>
        <EventMap
          center={{ lat: filters.lat, lng: filters.lng }}
          radiusKm={filters.radius}
          events={events}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </main>
    </div>
  );
}
