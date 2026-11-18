# HappnHub

Local event discovery with a map and location search.

## Prerequisites
- Node.js 20+
- Docker Desktop
- A [Mapbox](https://account.mapbox.com/) access token
- A [Ticketmaster Discovery API](https://developer.ticketmaster.com/) key (only needed for ingestion)

## Setup

```sh
docker compose up -d

# 2. API server
cd server
cp .env.example .env        # fill in TICKETMASTER_API_KEY
npm install
npm run dev                 # http://localhost:4000

# 3. Client (in a second terminal)
cd client
cp .env.example .env        
npm install
npm run dev                 # http://localhost:5173
```

## Loading real events

```sh
cd server
npm run ingest -- --lat 40.7608 --lng -111.8910 --radius 50 --pages 5
```

## Tests

```sh
cd server
npm test    # requires the database to be running
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/events` | Search: `lat`, `lng`, `radius` (km), `q`, `category`, `from`, `to`, `limit`, `offset` |
| GET | `/api/events/:id` | Single event |
| GET | `/api/categories` | Categories with event counts |
| GET | `/api/geocode?q=` | Place name → coordinates (Mapbox) |

Responses are `{ data, meta }` on success and `{ error: { message } }` on failure.
