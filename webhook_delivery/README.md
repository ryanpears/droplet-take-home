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

## API

### `POST /webhooks/register`

Register a webhook.

**Body**

```json
{
  "event": "user.created",
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
