const express = require('express');
const { registerWebhook, updateWebhook, listWebhooks, createEvent } = require('./webhooks');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.post('/webhooks/register', (req, res) => {
    const { event, method, hostname, path } = req.body;
    if (!event || !method || !hostname || !path) {
      return res.status(400).json({ error: 'event, method, hostname, and path are required' });
    }

    const id = registerWebhook(db, req.body);
    return res.status(200).json({ id });
  });

  app.put('/webhooks/:id', (req, res) => {
    const id = Number(req.params.id);
    const { event, hostname, path } = req.body;
    if (!event || !hostname || !path) {
      return res.status(400).json({ error: 'event, hostname, and path are required' });
    }

    const updated = updateWebhook(db, id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'webhook not found' });
    }

    return res.sendStatus(204);
  });

  app.get('/webhooks', (_req, res) => {
    res.json(listWebhooks(db));
  });

  // events 
  app.post('/event', (req, res) => {
    const { eventName, payload } = req.body;
    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    const id = createEvent(db, { eventName, payload });
    return res.status(200).json({ id });
  });

  return app;
}

module.exports = { createApp };
