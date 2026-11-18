import { formatDate } from '../format.js';

export default function ResultsList({ events, meta, loading, error, selectedId, onSelect }) {
  if (error) return <p className="status error">Could not load events: {error}</p>;
  if (loading && !events.length) return <p className="status">Loading events...</p>;
  if (!events.length) return <p className="status">No events match your search. Try a wider radius.</p>;

  return (
    <section className="results" aria-label="Results">
      <p className="status">
        {meta?.total ?? events.length} event{(meta?.total ?? events.length) === 1 ? '' : 's'} found
        {loading && ' · updating...'}
      </p>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className={`result ${event.id === selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(event.id)}
            >
              <span className="result-name">{event.name}</span>
              <span className="result-meta">
                {formatDate(event.startsAt)}
                {event.venue && ` · ${event.venue.name}`}
              </span>
              <span className="result-tags">
                {event.category && <span className="tag">{event.category.name}</span>}
                {event.distanceKm != null && <span className="distance">{event.distanceKm} km</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
