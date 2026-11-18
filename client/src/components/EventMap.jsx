import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const RAW_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const TOKEN = RAW_TOKEN && !RAW_TOKEN.startsWith('your-') ? RAW_TOKEN : undefined;

function circlePolygon(lng, lat, radiusKm, steps = 64) {
  const coords = [];
  const R = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const d = radiusKm / R;
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const pLat = Math.asin(Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing));
    const pLng =
      lngRad +
      Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * Math.sin(pLat));
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function eventsToGeoJSON(events, selectedId) {
  return {
    type: 'FeatureCollection',
    features: events
      .filter((e) => e.venue)
      .map((e) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.venue.lng, e.venue.lat] },
        properties: { id: e.id, name: e.name, selected: e.id === selectedId },
      })),
  };
}

export default function EventMap({ center, radiusKm, events, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return undefined;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('radius', { type: 'geojson', data: circlePolygon(center.lng, center.lat, radiusKm) });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius',
        paint: { 'fill-color': '#4f46e5', 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius',
        paint: { 'line-color': '#4f46e5', 'line-width': 1.5, 'line-dasharray': [2, 2] },
      });

      map.addSource('events', { type: 'geojson', data: eventsToGeoJSON([], null) });
      map.addLayer({
        id: 'events',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 10, 7],
          'circle-color': ['case', ['get', 'selected'], '#e11d48', '#4f46e5'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', 'events', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id != null) onSelectRef.current(Number(id));
      });
      map.on('mouseenter', 'events', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'events', () => (map.getCanvas().style.cursor = ''));

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Update the search radius circle and recenter when the location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource('radius').setData(circlePolygon(center.lng, center.lat, radiusKm));
    const ring = circlePolygon(center.lng, center.lat, radiusKm).geometry.coordinates[0];
    const bounds = ring.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(ring[0], ring[0]));
    map.fitBounds(bounds, { padding: 40, duration: 600 });
  }, [ready, center.lng, center.lat, radiusKm]);

  // Update event points and selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource('events').setData(eventsToGeoJSON(events, selectedId));
  }, [ready, events, selectedId]);

  // Fly to the selected event.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || selectedId == null) return;
    const event = events.find((e) => e.id === selectedId);
    if (event?.venue) map.easeTo({ center: [event.venue.lng, event.venue.lat], duration: 500 });
  }, [ready, selectedId]);

  if (!TOKEN) {
    return (
      <div className="map map-placeholder">
        <p>
          Map unavailable. Add <code>VITE_MAPBOX_TOKEN</code> to <code>client/.env</code> and restart the dev
          server.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="map" />;
}
