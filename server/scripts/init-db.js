const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDb() {
  console.log('=== GridGuard PostgreSQL Schema Initializer ===\n');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const targetDb = process.env.DB_NAME || 'gridguard';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';

  // Step 1: Ensure target database exists by connecting to 'postgres' system database
  console.log(`Connecting to PostgreSQL host ${host}:${port} as user '${user}'...`);
  const adminClient = new Client({
    host,
    port,
    database: 'postgres',
    user,
    password,
  });

  try {
    await adminClient.connect();
    console.log('✓ Successfully connected to PostgreSQL server.');

    // Check if gridguard database exists
    const checkDb = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (checkDb.rowCount === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating database...`);
      // CREATE DATABASE cannot run in a transaction block
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✓ Database '${targetDb}' created successfully.`);
    } else {
      console.log(`Database '${targetDb}' already exists.`);
    }

    await adminClient.end();
  } catch (err) {
    console.warn(`[Note] Could not create database via 'postgres' admin db: ${err.message}`);
    console.log(`Attempting direct connection to target database '${targetDb}'...`);
    try {
      await adminClient.end();
    } catch (_) {}
  }

  // Step 2: Connect to target database and execute schema.sql
  const dbClient = new Client({
    host,
    port,
    database: targetDb,
    user,
    password,
  });

  try {
    await dbClient.connect();
    console.log(`Connected to database '${targetDb}'. Executing schema.sql...`);

    const schemaPath = path.join(__dirname, '../schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await dbClient.query(sql);
    console.log('✓ All tables, indexes, and constraints initialized successfully:');
    console.log('   - users');
    console.log('   - telemetry');
    console.log('   - alerts');
    console.log('   - system_settings');
    console.log('   - simulation_state');

    await dbClient.end();
    console.log('\nDatabase initialization complete! You can now run "npm run db:seed" to load demo data.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ PostgreSQL Database Initialization Error:');
    console.error(err.message);
    console.error('\nTroubleshooting Checklist:');
    console.error(' 1. Ensure PostgreSQL server is installed and running on port ' + port);
    console.error(' 2. Verify credentials in server/.env (DB_USER, DB_PASSWORD, DB_NAME)');
    console.error(' 3. In PostgreSQL (psql), you can run: CREATE DATABASE ' + targetDb + ';');
    try {
      await dbClient.end();
    } catch (_) {}
    process.exit(1);
  }
}

initDb();
