// backend/db/init.js
// For LOCAL (non-container) development only.
// Run with `npm run db:init` from inside backend/.
// Applies ../../database/*.sql in order against the DB in your .env.
//
// When running in Docker/Kubernetes, you don't need this file at all —
// the official postgres image auto-runs every .sql file in
// /docker-entrypoint-initdb.d/ on first container start, and the
// database/ folder is mounted straight into that path.

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

const DB_DIR = path.join(__dirname, '..', '..', 'database');

async function run() {
  const files = fs.readdirSync(DB_DIR).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf8');
      await client.query(sql);
    }
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
