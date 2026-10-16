const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// PostgreSQL Pool configuration
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'gridguard',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

let isConnected = false;
let lastConnectionError = null;

// Pool error handling for idle clients
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err.message);
  isConnected = false;
  lastConnectionError = err.message;
});

/**
 * Checks PostgreSQL connectivity and logs diagnostic information
 */
async function checkDbConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    client.release();
    isConnected = true;
    lastConnectionError = null;
    return {
      success: true,
      database: res.rows[0].db_name,
      time: res.rows[0].current_time,
      version: res.rows[0].pg_version,
    };
  } catch (err) {
    isConnected = false;
    lastConnectionError = err.message;
    return {
      success: false,
      error: err.message,
      code: err.code,
    };
  }
}

/**
 * Executes a parameterized SQL query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[Slow Query] ${duration}ms: ${text.substring(0, 100)}...`);
    }
    return res;
  } catch (err) {
    // Check if error is database connectivity error
    if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.code === '3D000') {
      isConnected = false;
      lastConnectionError = err.message;
    }
    throw err;
  }
}

/**
 * Executes queries inside a PostgreSQL transaction
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function getDbStatus() {
  return {
    isConnected,
    lastConnectionError,
    config: {
      host: poolConfig.host || 'remote',
      port: poolConfig.port || 5432,
      database: poolConfig.database || 'gridguard',
      user: poolConfig.user || 'postgres',
    },
  };
}

module.exports = {
  pool,
  query,
  transaction,
  checkDbConnection,
  getDbStatus,
};
