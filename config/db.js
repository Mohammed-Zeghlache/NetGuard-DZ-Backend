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
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected pool error:', err.message);
});

function testConnection() {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('⚠️ Database connection issue... Retrying in 3 seconds. Error:', err.message);
      setTimeout(testConnection, 3000);
    } else {
      console.log('✅ Connected to PostgreSQL database successfully! Time:', res.rows[0].now);
    }
  });
}

testConnection();

module.exports = pool;



