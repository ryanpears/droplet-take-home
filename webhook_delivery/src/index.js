const path = require('path');
const { createDb } = require('./db');
const { createApp } = require('./app');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'webhooks.db');
const db = createDb(dbPath);
const app = createApp(db);

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`listening on http://localhost:${port}`);
  });
}

module.exports = { app, db };
