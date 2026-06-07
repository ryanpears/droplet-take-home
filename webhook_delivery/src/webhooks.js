function upsertAuthToken(db, { authToken, authTokenHeader, existingAuthTokenId }) {
  if (authToken == null) {
    return null;
  }

  const header = authTokenHeader ?? 'authorization';

  if (existingAuthTokenId != null) {
    db.prepare(
      `UPDATE auth_token
       SET auth_token = ?, auth_token_header = ?, modified = datetime('now')
       WHERE id = ?`
    ).run(authToken, header, existingAuthTokenId);
    return existingAuthTokenId;
  }

  const result = db
    .prepare(
      `INSERT INTO auth_token (auth_token, auth_token_header)
       VALUES (?, ?)`
    )
    .run(authToken, header);
  return result.lastInsertRowid;
}

function registerWebhook(db, body) {
  const authTokenId = upsertAuthToken(db, {
    authToken: body.authToken,
    authTokenHeader: body.authTokenHeader,
    existingAuthTokenId: null,
  });

  const result = db
    .prepare(
      `INSERT INTO webhook (event_name, method, hostname, path, auth_token_id, max_retries)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.event,
      body.method,
      body.hostname,
      body.path,
      authTokenId,
      body.retries ?? 0
    );

  return result.lastInsertRowid;
}

function updateWebhook(db, id, body) {
  const existing = db
    .prepare('SELECT id, auth_token_id FROM webhook WHERE id = ?')
    .get(id);

  if (!existing) {
    return false;
  }

  const authTokenId = upsertAuthToken(db, {
    authToken: body.authToken,
    authTokenHeader: body.authTokenHeader,
    existingAuthTokenId: existing.auth_token_id,
  });

  db.prepare(
    `UPDATE webhook
     SET event_name = ?,
        method = ?,
        hostname = ?,
        path = ?,
        auth_token_id = ?,
        max_retries = ?,
        modified = datetime('now')
     WHERE id = ?`
  ).run(
    body.event,
    body.method,
    body.hostname,
    body.path,
    authTokenId,
    body.retries ?? 0,
    id
  );

  return true;
}

function listWebhooks(db) {
  return db
    .prepare(
      `SELECT
         w.id,
         w.event_name AS event,
         w.method,
         w.hostname,
         w.path,
         w.last_success AS lastSuccess,
         w.max_retries AS maxRetries,
         (SELECT COUNT(*) FROM event_delivery ed
          WHERE ed.webhook_id = w.id AND ed.success = 1) AS totalSuccesses,
         (SELECT COUNT(*) FROM event_delivery ed
          WHERE ed.webhook_id = w.id AND ed.attempt_count > 0
            AND ed.attempt_count < w.max_retries) AS totalRetries,
         (SELECT COUNT(*) FROM event_delivery ed
          WHERE ed.webhook_id = w.id AND ed.attempt_count >= w.max_retries) AS totalErrors
       FROM webhook w
       ORDER BY w.id`
    )
    .all();
}

function createEvent(db, body) {
  // This will drop events without a webhook.
  const result = db.prepare(
    `INSERT INTO event_delivery (webhook_id, event_payload)
     SELECT 
      webhook_id, 
      ? AS event_payload
     FROM webhook 
     WHERE event_name = ?`
  ).run(body.payload, body.eventName);
  return result.lastInsertRowid;
}

module.exports = {
  registerWebhook,
  updateWebhook,
  listWebhooks,
};
