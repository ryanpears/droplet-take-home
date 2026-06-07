const { resetDb } = require('../src/db');

const dbPath = resetDb();
console.log(`Database reset at ${dbPath}`);
