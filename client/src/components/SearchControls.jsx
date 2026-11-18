import { useEffect, useState } from 'react';
import { geocode, getCategories } from '../api/client.js';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function SearchControls({ filters, locationName, onChange }) {
  const [draftQ, setDraftQ] = useState(filters.q || '');
  const [placeText, setPlaceText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  function submitKeyword(e) {
    e.preventDefault();
    onChange({ q: draftQ.trim() });
  }

  async function searchPlace(e) {
    e.preventDefault();
    if (!placeText.trim()) return;
    setMessage(null);
    try {
      const { data } = await geocode(placeText.trim());
      if (!data.length) setMessage('No matching places found.');
      setSuggestions(data);
    } catch (err) {
      setMessage(err.message);
    }
  }

  function pickPlace(place) {
    setSuggestions([]);
    setPlaceText('');
    onChange({ lat: place.lat, lng: place.lng }, place.name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Your browser does not support geolocation.');
      return;
    }
    setMessage('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMessage(null);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'My location');
      },
      () => setMessage('Could not get your location.'),
    );
  }

  return (
    <section className="search-controls" aria-label="Search events">
      <form className="row" onSubmit={submitKeyword}>
        <input
          type="search"
          placeholder="Search events (e.g. jazz, comedy)"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          aria-label="Keyword"
        />
        <button type="submit">Search</button>
      </form>

      <div className="location-line">
        Near <strong>{locationName}</strong>
      </div>

      <form className="row" onSubmit={searchPlace}>
        <input
          type="text"
          placeholder="City, address, or ZIP"
          value={placeText}
          onChange={(e) => setPlaceText(e.target.value)}
          aria-label="Location"
        />
        <button type="submit">Go</button>
        <button type="button" className="secondary" onClick={useMyLocation} title="Use my location">
          📍
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={`${s.lng},${s.lat}`}>
              <button type="button" onClick={() => pickPlace(s)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="hint">{message}</p>}

      <div className="row filters">
        <label>
          Radius
          <select value={filters.radius} onChange={(e) => onChange({ radius: Number(e.target.value) })}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select
            value={filters.category || ''}
            onChange={(e) => onChange({ category: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row filters">
        <label>
          From
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => onChange({ from: e.target.value || undefined })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => onChange({ to: e.target.value || undefined })}
          />
        </label>
      </div>
    </section>
  );
}
