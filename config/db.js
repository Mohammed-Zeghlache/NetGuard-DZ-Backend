const { Pool } = require('pg');
require('dotenv').config();

// const pool = new Pool({
//   host: process.env.DB_HOST ,
//   port: process.env.DB_PORT ,
//   user: process.env.DB_USER ,
//   password: process.env.DB_PASSWORD ,
//   database: process.env.DB_NAME  ,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

const pool = new Pool({
  host: process.env.DB_HOST ,
  port: process.env.DB_PORT ,
  user: process.env.DB_USER ',
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false
  }
});


// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

module.exports = pool;
