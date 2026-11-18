export function formatDate(value, long = false) {
  if (!value) return 'Date TBA';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    weekday: long ? 'long' : 'short',
    month: long ? 'long' : 'short',
    day: 'numeric',
    year: long ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPrice({ priceMin, priceMax, currency }) {
  if (priceMin == null && priceMax == null) return null;
  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n);
  if (priceMin === 0 && (priceMax == null || priceMax === 0)) return 'Free';
  if (priceMax == null || priceMin === priceMax) return fmt(priceMin ?? priceMax);
  return `${fmt(priceMin)} – ${fmt(priceMax)}`;
}
