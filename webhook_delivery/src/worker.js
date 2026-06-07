const path = require('path');
const { createDb } = require('./db');
const { createQueue } = require('./event_processor_queue');

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startQueue(queue, { sleep = defaultSleep, sleepMs = 1000 } = {}) {
  while (true) {
    try {
      const eventId = await queue.poll();

      if (!eventId) {
        await sleep(sleepMs);
        continue;
      }

      await queue.processEvent(eventId);
    } catch (err) {
      console.error('Error in event processing: ', err);
      await sleep(sleepMs);
    }
  }
}

if (require.main === module) {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'webhooks.db');
  const db = createDb(dbPath);
  const eventProcessorQueue = createQueue(db);

  startQueue(eventProcessorQueue).catch((err) => {
    console.error('fatal error in event processor queue', err);
    process.exit(1);
  });
}

module.exports = { startQueue, defaultSleep };
