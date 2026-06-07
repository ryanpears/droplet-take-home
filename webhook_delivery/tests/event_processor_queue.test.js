const { createDb } = require('../src/db');
const { createQueue } = require('../src/event_processor_queue');
const { seedWebhook, seedDelivery } = require('./helpers/queue');

describe('EventProcessorQueue', () => {
  let db;
  let queue;

  beforeEach(() => {
    db = createDb();
    queue = createQueue(db);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    db.close();
    jest.restoreAllMocks();
  });

  test('poll returns undefined when there is no work', async () => {
    await expect(queue.poll()).resolves.toBeUndefined();
  });

  test('poll claims a pending delivery and locks it', async () => {
    const webhookId = seedWebhook(db);
    const deliveryId = seedDelivery(db, webhookId);

    await expect(queue.poll()).resolves.toBe(deliveryId);

    const row = db.prepare('SELECT locked FROM event_delivery WHERE id = ?').get(deliveryId);
    expect(row.locked).toBe(1);
  });

  test('poll skips successful, locked, and exhausted deliveries', async () => {
    const webhookId = seedWebhook(db, { maxRetries: 2 });
    seedDelivery(db, webhookId, { success: 1 });
    seedDelivery(db, webhookId, { locked: 1 });
    seedDelivery(db, webhookId, { attemptCount: 2 });

    await expect(queue.poll()).resolves.toBeUndefined();
  });

  test('processEvent marks delivery successful and updates webhook last_success', async () => {
    const webhookId = seedWebhook(db, { hostname: 'hooks.example.com', path: '/receive' });
    const deliveryId = seedDelivery(db, webhookId, { payload: '{"ok":true}' });

    global.fetch.mockResolvedValue({ ok: true });

    await expect(queue.processEvent(deliveryId)).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/receive',
      expect.objectContaining({
        method: 'POST',
        body: '{"ok":true}',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );

    const delivery = db.prepare('SELECT success, locked, error FROM event_delivery WHERE id = ?').get(deliveryId);
    expect(delivery.success).toBe(1);
    expect(delivery.locked).toBe(0);
    expect(delivery.error).toBeNull();

    const webhook = db.prepare('SELECT last_success FROM webhook WHERE id = ?').get(webhookId);
    expect(webhook.last_success).toBeTruthy();
  });

  test('processEvent sends auth header when webhook has a token', async () => {
    const webhookId = seedWebhook(db, {
      authToken: { value: 'secret-token', header: 'x-api-key' },
    });
    const deliveryId = seedDelivery(db, webhookId);

    global.fetch.mockResolvedValue({ ok: true });
    await queue.processEvent(deliveryId);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'secret-token',
        }),
      })
    );
  });

  test('processEvent records HTTP failures', async () => {
    const webhookId = seedWebhook(db);
    const deliveryId = seedDelivery(db, webhookId);

    global.fetch.mockResolvedValue({ ok: false, statusText: 'Bad Gateway' });

    await expect(queue.processEvent(deliveryId)).resolves.toBe(false);

    const delivery = db
      .prepare('SELECT success, attempt_count, error, locked FROM event_delivery WHERE id = ?')
      .get(deliveryId);

    expect(delivery.success).toBe(0);
    expect(delivery.attempt_count).toBe(1);
    expect(delivery.error).toBe('Bad Gateway');
    expect(delivery.locked).toBe(0);
  });

  test('processEvent records network failures', async () => {
    const webhookId = seedWebhook(db);
    const deliveryId = seedDelivery(db, webhookId);

    global.fetch.mockRejectedValue(new Error('network down'));

    await expect(queue.processEvent(deliveryId)).resolves.toBe(false);

    const delivery = db.prepare('SELECT attempt_count, error FROM event_delivery WHERE id = ?').get(deliveryId);
    expect(delivery.attempt_count).toBe(1);
    expect(delivery.error).toBe('network down');
  });
});
