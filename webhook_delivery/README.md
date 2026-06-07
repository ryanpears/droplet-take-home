# Webhook delivery API

Small Express + SQLite service for registering webhooks and reporting delivery stats.

## Prerequisites

- Node.js 18+

## Setup

From this directory (`webhook_delivery/`):

```bash
npm install
mkdir -p data
```

## Run

```bash
npm start
```

This starts three processes:

- **API server** — `http://localhost:3000`
- **Worker** — background event delivery
- **Dashboard** — React UI at `http://localhost:5173`

The dashboard polls `GET /webhooks` and shows registered webhooks with delivery stats.

### Quick verify with curl

With `npm start` running, register a webhook (points at [httpbin.org](https://httpbin.org) so the worker gets a real `200` response):

```bash
curl -X POST http://localhost:3000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user.created",
    "method": "POST",
    "hostname": "httpbin.org",
    "path": "/post",
    "retries": 3
  }'
```

Post an event (`eventName` must match the webhook `event` above):

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "user.created",
    "payload": "{\"userId\": 42}"
  }'
```

Check delivery stats (or open the dashboard at `http://localhost:5173`):

```bash
curl http://localhost:3000/webhooks
```

After a few seconds the worker should deliver the event. `totalSuccesses` should increment and `lastSuccess` should be set.

The server listens on port `3000` by default. Override with `PORT`:

```bash
PORT=4000 npm start
```

SQLite is stored at `data/webhooks.db` by default. Override with `DB_PATH`:

```bash
DB_PATH=./data/custom.db npm start
```

## Test

```bash
npm test
```

## Reset database (development)

When `schema.sql` changes, wipe the local SQLite file and recreate tables from scratch:

```bash
npm run db:reset
```

Uses `data/webhooks.db` by default. Override with `DB_PATH`:

```bash
DB_PATH=./data/custom.db npm run db:reset
```

Stop the server and worker before resetting if they are running.

## API

### `POST /webhooks/register`

Register a webhook.

**Body**

```json
{
  "event": "user.created",
  "method": "POST",
  "hostname": "example.com",
  "path": "/hooks",
  "authToken": "optional-secret",
  "authTokenHeader": "authorization",
  "retries": 3
}
```

**Response:** `200` with `{ "id": <webhook id> }`

### `PUT /webhooks/:id`

Update a webhook. Same body shape as register.

**Response:** `204` on success, `404` if the webhook does not exist.

### `GET /webhooks`

List all webhooks with delivery aggregates:

```json
[
  {
    "id": 1,
    "event": "user.created",
    "method": "POST",
    "hostname": "example.com",
    "path": "/hooks",
    "lastSuccess": "2026-06-03 12:00:00",
    "totalSuccesses": 0,
    "totalErrors": 0,
    "totalRetries": 0
  }
]
```

- `lastSuccess` — from the `webhook.last_success` column
- `totalSuccesses` — `event_delivery` rows with `success = true`
- `totalRetries` — rows with `0 < attempt_count < max_retries`
- `totalErrors` — rows with `attempt_count >= max_retries`

## Database

Schema lives in `schema.sql` (SQLite types: timestamps as `TEXT`, JSON payloads as `TEXT`). Tables: `auth_token`, `webhook`, `event_delivery`.
