const pgp = require('pg-promise')();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check your .env file.');
}

const db = pgp(process.env.DATABASE_URL);

// Test connection on startup
db.connect()
  .then((cn) => {
    console.log('✅ Connected to PostgreSQL:', cn.client.database);
    cn.done(); // release the connection back to the pool
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
  });

module.exports = db;
