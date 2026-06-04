const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const schemaPath = path.join(__dirname, '..', 'schema.sql');

function createDb(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const initialized = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'webhook'")
    .get();
  if (!initialized) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }
  return db;
}

module.exports = { createDb };
