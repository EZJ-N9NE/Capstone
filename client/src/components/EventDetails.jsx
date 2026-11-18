import { formatDate, formatPrice } from '../format.js';

export default function EventDetails({ event, onClose }) {
  if (!event) return null;
  const { venue } = event;
  const address = venue && [venue.address, venue.city, venue.state, venue.postalCode].filter(Boolean).join(', ');
  const price = formatPrice(event);

  return (
    <article className="event-details" aria-label="Event details">
      <button type="button" className="close" onClick={onClose} aria-label="Close details">
        ×
      </button>
      {event.imageUrl && <img src={event.imageUrl} alt="" />}
      <h2>{event.name}</h2>
      {event.category && <span className="tag">{event.category.name}</span>}
      <dl>
        <dt>When</dt>
        <dd>{formatDate(event.startsAt, true)}</dd>
        {venue && (
          <>
            <dt>Where</dt>
            <dd>
              {venue.name}
              {address && <div className="muted">{address}</div>}
            </dd>
          </>
        )}
        {price && (
          <>
            <dt>Price</dt>
            <dd>{price}</dd>
          </>
        )}
        {event.distanceKm != null && (
          <>
            <dt>Distance</dt>
            <dd>{event.distanceKm} km away</dd>
          </>
        )}
      </dl>
      {event.description && <p>{event.description}</p>}
      {event.url && (
        <a className="button" href={event.url} target="_blank" rel="noreferrer">
          Get tickets
        </a>
      )}
    </article>
  );
}
