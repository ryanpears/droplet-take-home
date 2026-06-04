You need to set up a small, simple backend. For the technology lets keep it simple with Node.js, Express, and SQLite. For setup instructions do not run any command, instead place them in the README.md in this `webhooks_delivery` folder. 

We will need a few tables in the database to be defined as such 

CREATE TABLE auth_token(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    authToken TEXT NOT NULL,
    authTokenHeader TEXT NOT NULL DEFAULT 'authorization'
    created timestamptz NOT NULL DEFAULT NOW(),
    modified timestamptz NOT NULL DEFAULT NOW(),
); 

CREATE TABLE webhook(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULLm
    hostname TEXT NOT NULL,
    path TEXT NOT NULL, 
    auth_token_id INTEGER REFERENCES auth_token(id) ON DELETE RESTRICT,
    max_retries INTEGER NOT NULL DEFAULT 0,
    last_success timestamptz,
    created timestamptz NOT NULL DEFAULT NOW(),
    modified timestamptz NOT NULL DEFAULT NOW(),
); 

CREATE TABLE event_delivery(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES webhook(id) ON DELETE CASCADE,
    event_payload jsonb, 
    success BOOLEAN NOT NULL DEFAULT FALSE,
    last_attempt timestamptz,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created timestamptz
);

For the actual meat of the api we need to have a few endpoints: 

1. POST /webhooks/register with body `{
    event: string;
    hostname: string;
    path: string; 
    authToken: string | null;
    authTokenHeader: string | null; 
    retries: number | null; 
}`

This will insert into the auth_token and webhook tables defined above. It will also return http 200 and the id of the webhook from the db. 

2. PUT /webhooks/{id} with body `{
    event: string;
    hostname: string;
    path: string; 
    authToken: string | null;
    authTokenHeader: string | null; 
    retries: number | null; 
}`

This will insert into the tables auth_token and webhook  defined above. It will also return http 204. 

3. GET /webhooks will return a list of all webhooks. The return type for each webhook in the list should be like so `{
    id: number;
    event: string;
    hostname: string;
    path: string; 
    lastSuccess: datetime | null;
    totalSuccesses: number;
    totalErrors: number;
    totalRetries: number; 
}`

The lastSuccess will be webhook, 
totalSuccesses will be count of event_delivery that have success = TRUE 
totalNotStarted count of event_delivery that have attempt_count = 0 
totalRetries will be count of event_delivery that have attempt_count > 0 but attempt_count < max_retries
totalErrors will be count of event_delivery that have attempt_count >= max_retries