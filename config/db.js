// const { Pool } = require('pg');
// require('dotenv').config();

// // const pool = new Pool({
// //   host: process.env.DB_HOST ,
// //   port: process.env.DB_PORT ,
// //   user: process.env.DB_USER ,
// //   password: process.env.DB_PASSWORD ,
// //   database: process.env.DB_NAME ,
// //   max: 20,
// //   idleTimeoutMillis: 30000,
// //   connectionTimeoutMillis: 2000,
// //   ssl: {
// //     rejectUnauthorized: false
// //   }
// // });

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
//   // Automatically handles SSL for both internal and external connections
//   ssl: process.env.DB_HOST && process.env.DB_HOST.includes('render.com') 
//     ? { rejectUnauthorized: false } 
//     : false
// });

// module.exports = pool;


// // Test connection
// pool.connect((err, client, release) => {
//   if (err) {
//     console.error('❌ Database connection error:', err.message);
//   } else {
//     console.log('✅ Connected to PostgreSQL database');
//     release();
//   }
// });

// module.exports = pool;


const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout to give Render time to respond
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Self-healing connection tester with retry logic
function connectWithRetry() {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('⚠️ Database waking up... Retrying in 3 seconds. Error:', err.message);
      setTimeout(connectWithRetry, 3000); // Wait 3 seconds and try again
    } else {
      console.log('✅ Connected to PostgreSQL database successfully!');
      release();
    }
  });
}

connectWithRetry();

module.exports = pool;
