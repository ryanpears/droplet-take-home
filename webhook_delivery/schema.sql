CREATE TABLE auth_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_token TEXT NOT NULL,
    auth_token_header TEXT NOT NULL DEFAULT 'authorization',
    created TEXT NOT NULL DEFAULT (datetime('now')),
    modified TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE webhook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    hostname TEXT NOT NULL,
    path TEXT NOT NULL,
    auth_token_id INTEGER REFERENCES auth_token(id) ON DELETE RESTRICT,
    max_retries INTEGER NOT NULL DEFAULT 0,
    last_success TEXT,
    created TEXT NOT NULL DEFAULT (datetime('now')),
    modified TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_webhook_auth_token_id_fk ON webhook(auth_token_id);
CREATE UNIQUE INDEX idx_webhook_uniq ON webhook(event_name, method, hostname, path, auth_token_id);

CREATE TABLE event_delivery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES webhook(id) ON DELETE CASCADE,
    event_payload TEXT,
    locked INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 0,
    last_attempt TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created TEXT NOT NULL DEFAULT (datetime('now')),
    modified TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_delivery_webhook_id_fk ON event_delivery(webhook_id);
CREATE INDEX idx_event_delivery_in_flight ON event_delivery(id) WHERE success = 0;