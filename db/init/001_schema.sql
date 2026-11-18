-- HappnHub schema
-- PostGIS points are stored as (longitude, latitude), SRID 4326.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  external_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS venues (
  id          SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  postal_code TEXT,
  location    GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS venues_location_gix ON venues USING GIST (location);

CREATE TABLE IF NOT EXISTS events (
  id            SERIAL PRIMARY KEY,
  external_id   TEXT UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  url           TEXT,
  image_url     TEXT,
  starts_at     TIMESTAMPTZ,
  price_min     NUMERIC(10, 2),
  price_max     NUMERIC(10, 2),
  currency      TEXT,
  venue_id      INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED
);

CREATE INDEX IF NOT EXISTS events_search_gin ON events USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);
CREATE INDEX IF NOT EXISTS events_venue_idx ON events (venue_id);
CREATE INDEX IF NOT EXISTS events_category_idx ON events (category_id);
