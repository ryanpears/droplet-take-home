const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');
const { createQueue } = require('../src/event_processor_queue');

async function runWorkerOnce(queue) {
  const eventId = await queue.poll();
  if (!eventId) {
    return null;
  }
  return queue.processEvent(eventId);
}

describe('event delivery integration', () => {
  let db;
  let app;
  let queue;

  beforeEach(() => {
    db = createDb();
    app = createApp(db);
    queue = createQueue(db);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    db.close();
    jest.restoreAllMocks();
  });

  test('registers webhook, ingests event, worker delivers and marks success', async () => {
    global.fetch.mockResolvedValue({ ok: true });

    await request(app)
      .post('/webhooks/register')
      .send({
        event: 'user.created',
        method: 'POST',
        hostname: 'hooks.example.com',
        path: '/receive',
        authToken: 'secret-token',
        authTokenHeader: 'x-api-key',
        retries: 3,
      })
      .expect(200);

    const eventRes = await request(app)
      .post('/event')
      .send({
        eventName: 'user.created',
        payload: JSON.stringify({ userId: 42 }),
      })
      .expect(200);

    const processed = await runWorkerOnce(queue);
    expect(processed).toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/receive',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: 42 }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'secret-token',
        }),
      })
    );

    const delivery = db
      .prepare('SELECT success, locked, error FROM event_delivery WHERE id = ?')
      .get(eventRes.body.id);

    expect(delivery.success).toBe(1);
    expect(delivery.locked).toBe(0);
    expect(delivery.error).toBeNull();

    const webhook = db.prepare('SELECT last_success FROM webhook WHERE id = 1').get();
    expect(webhook.last_success).toBeTruthy();
  });
});
