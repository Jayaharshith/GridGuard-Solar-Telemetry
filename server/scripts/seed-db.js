const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedDb() {
  console.log('=== GridGuard PostgreSQL Database Seeder ===\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'gridguard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL.');

    // 1. Seed Users
    console.log('Seeding demo users...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@1234', salt);
    const operatorPasswordHash = await bcrypt.hash('Operator@1234', salt);

    const userRes = await client.query(
      `INSERT INTO users (full_name, username, email, password_hash)
       VALUES 
         ('Dr. Solar Administrator', 'admin', 'admin@gridguard.energy', $1),
         ('Jane Doe - Field Engineer', 'operator', 'operator@gridguard.energy', $2)
       ON CONFLICT (username) DO UPDATE 
         SET password_hash = EXCLUDED.password_hash
       RETURNING id, username`,
      [adminPasswordHash, operatorPasswordHash]
    );

    const adminId = userRes.rows.find(r => r.username === 'admin')?.id || 1;
    console.log(`✓ Seeded users: admin (ID: ${adminId}), operator`);

    // 2. Seed Default Settings
    console.log('Seeding default alert thresholds and settings...');
    const defaultSettings = [
      ['battery_low_voltage_warning', '11.5'],
      ['battery_critical_voltage', '11.0'],
      ['low_soc_warning', '20.0'],
      ['critical_soc', '10.0'],
      ['high_temp_warning', '65.0'],
      ['low_irradiance_warning', '100.0'],
      ['simulation_update_interval', '3'],
      ['battery_rated_capacity_ah', '100'],
      ['system_nominal_voltage', '12.0']
    ];

    for (const [key, val] of defaultSettings) {
      await client.query(
        `INSERT INTO system_settings (user_id, setting_key, setting_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, setting_key) 
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [adminId, key, val]
      );
    }
    console.log('✓ Seeded system settings.');

    // 3. Seed Realistic 24-Hour Telemetry
    console.log('Generating 24-hour historical telemetry records...');
    
    // Clear old telemetry records if any
    await client.query('DELETE FROM telemetry');
    await client.query('DELETE FROM alerts');

    const totalPoints = 120; // 1 reading every 12 minutes over 24h
    const now = Date.now();
    const intervalMs = (24 * 60 * 60 * 1000) / totalPoints;

    let batterySoc = 75.0; // Starting battery SoC %
    let batteryVoltage = 12.6;

    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      const hour = timestamp.getHours() + timestamp.getMinutes() / 60; // 0 to 24

      // Solar diurnal model (sun rises ~6:00, peaks at 12:30, sets ~18:30)
      let irradiance = 0;
      let solarVoltage = 0;
      let solarCurrent = 0;
      let panelTemperature = 22.0 + Math.sin((hour / 24) * Math.PI) * 5; // Base ambient

      if (hour >= 6.0 && hour <= 18.5) {
        // Bell-shaped sun curve
        const sunFactor = Math.sin(((hour - 6.0) / 12.5) * Math.PI);
        const noise = (Math.random() - 0.5) * 0.08;
        const effectiveFactor = Math.max(0, Math.min(1, sunFactor + noise));

        irradiance = Math.round(effectiveFactor * 980 * 10) / 10;
        solarVoltage = Math.round((16.5 + effectiveFactor * 4.8 + (Math.random() - 0.5) * 0.4) * 100) / 100;
        solarCurrent = Math.round((effectiveFactor * 4.6 + (Math.random() - 0.5) * 0.2) * 100) / 100;
        if (solarCurrent < 0) solarCurrent = 0;
        panelTemperature = Math.round((25.0 + effectiveFactor * 38.0 + (Math.random() - 0.5) * 2) * 10) / 10;
      } else {
        // Night time
        irradiance = 0;
        solarVoltage = Math.round((0.5 + Math.random() * 0.3) * 100) / 100; // Open circuit residual
        solarCurrent = 0;
        panelTemperature = Math.round((20.0 + (Math.random() - 0.5) * 2) * 10) / 10;
      }

      // P = V * I (Law of Physics strictly maintained)
      const solarPower = Math.round(solarVoltage * solarCurrent * 100) / 100;

      // Battery Model: Load demand is approx 18-25W continuous
      const loadPower = 20.0;
      const netPower = solarPower - loadPower; // >0 charges battery, <0 discharges battery

      if (netPower > 0) {
        // Charging
        const chargeCurrent = Math.round((netPower / 13.5) * 100) / 100;
        batterySoc = Math.min(100, batterySoc + (chargeCurrent * (intervalMs / 3600000) / 100) * 100);
        batteryVoltage = Math.round((12.2 + (batterySoc / 100) * 1.9 + 0.3) * 100) / 100; // Float/bulk charge voltage boost
      } else {
        // Discharging
        const dischargeCurrent = Math.round((netPower / 12.2) * 100) / 100; // Negative value
        batterySoc = Math.max(15, batterySoc + (dischargeCurrent * (intervalMs / 3600000) / 100) * 100);
        batteryVoltage = Math.round((11.4 + (batterySoc / 100) * 1.3) * 100) / 100;
      }

      batterySoc = Math.round(batterySoc * 10) / 10;
      const batteryCurrent = Math.round((netPower / (batteryVoltage || 12.0)) * 100) / 100;

      // System status logic
      let systemStatus = 'Normal';
      if (batterySoc < 20 || batteryVoltage < 11.5 || panelTemperature > 65) {
        systemStatus = 'Warning';
      }
      if (batterySoc < 10 || batteryVoltage < 11.0) {
        systemStatus = 'Critical';
      }

      await client.query(
        `INSERT INTO telemetry 
         (solar_voltage, solar_current, solar_power, battery_voltage, battery_current, battery_soc, panel_temperature, irradiance, system_status, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          solarVoltage,
          solarCurrent,
          solarPower,
          batteryVoltage,
          batteryCurrent,
          batterySoc,
          panelTemperature,
          irradiance,
          systemStatus,
          timestamp,
        ]
      );
    }
    console.log(`✓ Seeded ${totalPoints} historical telemetry records.`);

    // 4. Seed Sample Alerts
    console.log('Seeding sample alerts...');
    const pastTime1 = new Date(now - 4 * 3600 * 1000);
    const pastTime2 = new Date(now - 12 * 3600 * 1000);

    await client.query(
      `INSERT INTO alerts (alert_type, severity, message, measured_value, threshold_value, status, created_at, resolved_at)
       VALUES 
         ('battery_low_voltage', 'warning', 'Battery voltage dropped below 11.5V threshold during peak evening discharge.', 11.42, 11.50, 'resolved', $1, $2),
         ('high_temperature', 'warning', 'Solar PV panel temperature exceeded 65.0°C under peak midday irradiance.', 67.4, 65.0, 'resolved', $2, $1)`,
      [pastTime2, pastTime1]
    );
    console.log('✓ Seeded historical alerts.');

    await client.end();
    console.log('\n======================================================');
    console.log('🎉 Seeding completed successfully!');
    console.log('Default credentials:');
    console.log('  Username: admin');
    console.log('  Password: Admin@1234');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    try {
      await client.end();
    } catch (_) {}
    process.exit(1);
  }
}

seedDb();
