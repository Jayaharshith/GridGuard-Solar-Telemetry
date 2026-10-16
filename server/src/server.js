const path = require('path');
const fs = require('fs');
const app = require('./app');
const db = require('./config/db');
const simulationEngine = require('./services/simulationEngine');
const { ensurePostgresRunning, stopEmbeddedPostgres } = require('./config/embeddedPostgres');

const PORT = parseInt(process.env.PORT || '5000', 10);
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

async function autoSetupDatabase() {
  const { Client } = require('pg');
  const host = process.env.DB_HOST || 'localhost';
  const targetDb = process.env.DB_NAME || 'gridguard';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';

  // 1. Connect to default 'postgres' database to create 'gridguard' if not exists
  const adminClient = new Client({ host, port: DB_PORT, database: 'postgres', user, password });
  try {
    await adminClient.connect();
    const checkDb = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
    if (checkDb.rowCount === 0) {
      console.log(`[Auto-Setup] Creating database "${targetDb}"...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[Auto-Setup] Database "${targetDb}" created.`);
    }
    await adminClient.end();
  } catch (err) {
    try { await adminClient.end(); } catch (_) {}
  }

  // 2. Connect to gridguard database and check if tables exist; if not, execute schema.sql and seed
  const dbClient = new Client({ host, port: DB_PORT, database: targetDb, user, password });
  try {
    await dbClient.connect();
    const checkTables = await dbClient.query("SELECT to_regclass('public.users') AS users_table");
    if (!checkTables.rows[0].users_table) {
      console.log('[Auto-Setup] Tables not found. Initializing PostgreSQL schema.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
      await dbClient.query(schemaSql);
      console.log('[Auto-Setup] Schema initialized.');

      console.log('[Auto-Setup] Seeding demo operator user and initial 24h telemetry curve...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const adminPass = await bcrypt.hash('Admin@1234', salt);
      const operPass = await bcrypt.hash('Operator@1234', salt);

      const userRes = await dbClient.query(
        `INSERT INTO users (full_name, username, email, password_hash)
         VALUES 
           ('Dr. Solar Administrator', 'admin', 'admin@gridguard.energy', $1),
           ('Jane Doe - Field Engineer', 'operator', 'operator@gridguard.energy', $2)
         RETURNING id`,
        [adminPass, operPass]
      );
      const adminId = userRes.rows[0].id;

      // Seed settings
      const settings = [
        ['battery_low_voltage_warning', '11.5'],
        ['battery_critical_voltage', '11.0'],
        ['low_soc_warning', '20.0'],
        ['critical_soc', '10.0'],
        ['high_temp_warning', '65.0'],
        ['low_irradiance_warning', '100.0'],
        ['simulation_update_interval', '3'],
      ];
      for (const [k, v] of settings) {
        await dbClient.query(
          `INSERT INTO system_settings (user_id, setting_key, setting_value, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
          [adminId, k, v]
        );
      }

      // Seed baseline telemetry
      const now = Date.now();
      const totalPoints = 60;
      let soc = 75.0;
      for (let i = totalPoints; i >= 0; i--) {
        const time = new Date(now - i * (24 * 3600 * 1000 / totalPoints));
        const hour = time.getHours() + time.getMinutes() / 60;
        let irr = 0, v = 12.0, curr = 0, temp = 24.0;
        if (hour >= 6.0 && hour <= 18.5) {
          const factor = Math.sin(((hour - 6.0) / 12.5) * Math.PI);
          irr = Math.round(factor * 950 * 10) / 10;
          v = Math.round((16.8 + factor * 4.5) * 100) / 100;
          curr = Math.round(factor * 4.5 * 100) / 100;
          temp = Math.round((25.0 + factor * 35.0) * 10) / 10;
        }
        const p = Math.round(v * curr * 100) / 100;
        const netP = p - 20.0;
        const battCurr = Math.round((netP / 12.6) * 100) / 100;
        soc = Math.max(15, Math.min(100, soc + (battCurr * (24 / totalPoints) / 100) * 100));
        const battV = Math.round((11.5 + (soc / 100) * 1.5) * 100) / 100;
        await dbClient.query(
          `INSERT INTO telemetry (solar_voltage, solar_current, solar_power, battery_voltage, battery_current, battery_soc, panel_temperature, irradiance, system_status, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Normal', $9)`,
          [v, curr, p, battV, battCurr, Math.round(soc * 10) / 10, temp, irr, time]
        );
      }
      console.log('[Auto-Setup] Baseline seeding complete.');
    }
    await dbClient.end();
  } catch (err) {
    console.error('[Auto-Setup] Error during auto-setup:', err.message);
    try { await dbClient.end(); } catch (_) {}
  }
}

async function startServer() {
  console.log('====================================================');
  console.log('⚡ GridGuard: Solar PV Array & Battery Telemetry');
  console.log('====================================================\n');

  // Verify PostgreSQL Connectivity
  console.log('Checking PostgreSQL database connection...');
  let dbStatus = await db.checkDbConnection();

  if (!dbStatus.success) {
    console.log(`PostgreSQL not detected on port ${DB_PORT}. Starting local PostgreSQL service...`);
    const started = await ensurePostgresRunning(DB_PORT);
    if (started) {
      await autoSetupDatabase();
      dbStatus = await db.checkDbConnection();
    }
  } else {
    // DB is connected, verify tables
    await autoSetupDatabase();
  }

  if (dbStatus.success) {
    console.log(`✓ PostgreSQL Connected! Database: "${dbStatus.database}", Server Time: ${dbStatus.time}`);
  } else {
    console.warn('⚠️  PostgreSQL Database Connection Warning:');
    console.warn(`   Reason: ${dbStatus.error}`);
    console.warn('   Ensure PostgreSQL is started and run:');
    console.warn('     npm run db:init');
    console.warn('     npm run db:seed\n');
  }

  // Initialize and start simulation engine
  const autoStart = process.env.AUTO_START_SIMULATION !== 'false';
  if (autoStart) {
    await simulationEngine.init();
  }

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 GridGuard Backend API Server running at http://localhost:${PORT}`);
    console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`🔒 Authentication: Database-backed JWT`);
    console.log(`☀️  Notice: SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED\n`);
  });

  // Graceful shutdown handling
  async function shutdown(signal) {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    simulationEngine.stop();
    server.close(async () => {
      console.log('HTTP server closed.');
      await db.pool.end().catch(() => {});
      console.log('PostgreSQL connection pool closed.');
      await stopEmbeddedPostgres();
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced exit after 5000ms timeout.');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
