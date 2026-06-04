const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

function seedDeliveries(db, webhookId, maxRetries) {
  db.prepare(
    `INSERT INTO event_delivery (webhook_id, success, attempt_count)
     VALUES (?, 1, 0)`
  ).run(webhookId);

  db.prepare(
    `INSERT INTO event_delivery (webhook_id, success, attempt_count)
     VALUES (?, 0, 0)`
  ).run(webhookId);

  db.prepare(
    `INSERT INTO event_delivery (webhook_id, success, attempt_count)
     VALUES (?, 0, 1)`
  ).run(webhookId);

  db.prepare(
    `INSERT INTO event_delivery (webhook_id, success, attempt_count)
     VALUES (?, 0, ?)`
  ).run(webhookId, maxRetries);
}

describe('webhooks API', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb();
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('POST /webhooks/register creates a webhook and returns its id', async () => {
    const res = await request(app)
      .post('/webhooks/register')
      .send({
        event: 'user.created',
        hostname: 'example.com',
        path: '/hooks',
        authToken: 'secret',
        authTokenHeader: 'x-api-key',
        retries: 3,
      })
      .expect(200);

    expect(res.body.id).toBe(1);

    const row = db.prepare('SELECT * FROM webhook WHERE id = 1').get();
    expect(row.event_name).toBe('user.created');
    expect(row.max_retries).toBe(3);
    expect(row.auth_token_id).toBe(1);
  });

  test('PUT /webhooks/:id updates a webhook', async () => {
    await request(app)
      .post('/webhooks/register')
      .send({
        event: 'user.created',
        hostname: 'example.com',
        path: '/hooks',
        authToken: null,
        retries: 1,
      });

    await request(app)
      .put('/webhooks/1')
      .send({
        event: 'user.updated',
        hostname: 'api.example.com',
        path: '/v2/hooks',
        authToken: 'new-secret',
        authTokenHeader: null,
        retries: 5,
      })
      .expect(204);

    const row = db.prepare('SELECT * FROM webhook WHERE id = 1').get();
    expect(row.event_name).toBe('user.updated');
    expect(row.hostname).toBe('api.example.com');
    expect(row.max_retries).toBe(5);
  });

  test('GET /webhooks returns delivery stats', async () => {
    await request(app)
      .post('/webhooks/register')
      .send({
        event: 'order.placed',
        hostname: 'shop.example.com',
        path: '/webhook',
        authToken: null,
        retries: 3,
      });

    db.prepare(
      `UPDATE webhook SET last_success = datetime('now') WHERE id = 1`
    ).run();

    seedDeliveries(db, 1, 3);

    const res = await request(app).get('/webhooks').expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 1,
      event: 'order.placed',
      hostname: 'shop.example.com',
      path: '/webhook',
      totalSuccesses: 1,
      totalRetries: 1,
      totalErrors: 1,
    });
    expect(res.body[0].lastSuccess).toBeTruthy();
  });

  test('PUT /webhooks/:id returns 404 for missing webhook', async () => {
    await request(app)
      .put('/webhooks/999')
      .send({
        event: 'x',
        hostname: 'a.com',
        path: '/b',
        authToken: null,
        retries: 0,
      })
      .expect(404);
  });
});
