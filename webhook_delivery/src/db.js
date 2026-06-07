const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const schemaPath = path.join(__dirname, '..', 'schema.sql');

function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', 'data', 'webhooks.db');
}

function applySchema(db) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

function resetDb(dbPath = getDbPath()) {
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = createDb(dbPath);
  db.close();
  return dbPath;
}

function createDb(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const initialized = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'webhook'")
    .get();
  if (!initialized) {
    applySchema(db);
  }
  return db;
}

module.exports = { createDb, getDbPath, resetDb };
