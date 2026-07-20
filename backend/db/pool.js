// db/pool.js
// Central PostgreSQL connection pool (Data Tier access point).
// All queries in the app route through this single pool.

require('dotenv').config();
const { Pool } = require('pg');

// const pool = new Pool({
//   host: process.env.PGHOST || '10.179.236.2',
//   port: process.env.PGPORT || 5432,
//   user: process.env.PGUSER || 'postgres',
//   password: process.env.PGPASSWORD || 'Planner@123',
//   database: process.env.PGDATABASE || 'grocery',
// });

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

module.exports = pool;
