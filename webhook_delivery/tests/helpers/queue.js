function seedWebhook(db, { hostname = 'example.com', path = '/hook', maxRetries = 3, authToken = null, method = 'POST' } = {}) {
  let authTokenId = null;

  if (authToken) {
    const auth = db
      .prepare(
        `INSERT INTO auth_token (auth_token, auth_token_header)
         VALUES (?, ?)`
      )
      .run(authToken.value, authToken.header ?? 'authorization');
    authTokenId = auth.lastInsertRowid;
  }

  const webhook = db
    .prepare(
      `INSERT INTO webhook (event_name, method, hostname, path, auth_token_id, max_retries)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run('test.event', method, hostname, path, authTokenId, maxRetries);

  return webhook.lastInsertRowid;
}

function seedDelivery(db, webhookId, { payload = '{"id":1}', success = 0, locked = 0, attemptCount = 0 } = {}) {
  const delivery = db
    .prepare(
      `INSERT INTO event_delivery (webhook_id, event_payload, success, locked, attempt_count)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(webhookId, payload, success, locked, attemptCount);

  return delivery.lastInsertRowid;
}

module.exports = { seedWebhook, seedDelivery };
