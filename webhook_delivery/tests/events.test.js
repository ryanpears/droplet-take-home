const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('POST /event', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb();
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  test('returns 400 when eventName is missing', async () => {
    const res = await request(app)
      .post('/event')
      .send({ payload: { id: 1 } })
      .expect(400);

    expect(res.body).toEqual({ error: 'eventName is required' });
  });

  test('creates a delivery for a registered webhook event', async () => {
    await request(app)
      .post('/webhooks/register')
      .send({
        event: 'order.placed',
        method: 'POST',
        hostname: 'shop.example.com',
        path: '/webhook',
        retries: 3,
      })
      .expect(200);

    const res = await request(app)
      .post('/event')
      .send({
        eventName: 'order.placed',
        payload: JSON.stringify({ orderId: 99 }),
      })
      .expect(200);

    expect(res.body.id).toBeGreaterThan(0);

    const delivery = db.prepare('SELECT * FROM event_delivery WHERE id = ?').get(res.body.id);
    expect(delivery.webhook_id).toBe(1);
    expect(delivery.event_payload).toBe(JSON.stringify({ orderId: 99 }));
    expect(delivery.success).toBe(0);
    expect(delivery.locked).toBe(0);
  });

  test('does not create a delivery when no webhook matches eventName', async () => {
    const res = await request(app)
      .post('/event')
      .send({ eventName: 'unknown.event', payload: '{}' })
      .expect(200);

    expect(res.body.id).toBe(0);

    const count = db.prepare('SELECT COUNT(*) AS count FROM event_delivery').get().count;
    expect(count).toBe(0);
  });
});
