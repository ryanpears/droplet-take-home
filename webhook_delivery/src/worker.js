

const path = require('path');
const { createDb } = require('./db');
const { createQueue } = require('./event_processor_queue');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'webhooks.db');
const db = createDb(dbPath);

const eventProcessorQueue = createQueue(db);

async function startQueue() {
    while(true) {
        try {
            const eventId = await eventProcessorQueue.poll();

            if (!eventId) {
                console.log('No events to work');
                await sleep(1000);
                continue;
            }

            console.log('Processing event with id ', id);
            await eventProcessorQueue.processEvent(eventId);

        } catch (err) {
            console.error('Error in event processing: ', err)
            await sleep(1000);
            continue;
        }
    }
    
}

startQueue().catch((err) => {
    console.error('fatal error in event processor queue', err)
    process.exit(1);
});