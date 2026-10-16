const db = require('../config/db');
const alertService = require('./alertService');

class SimulationEngine {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.intervalSeconds = 3;
    this.isTicking = false;

    // Simulation state vector
    this.state = {
      solarVoltage: 18.4,
      solarCurrent: 3.2,
      solarPower: 58.88,
      batteryVoltage: 12.8,
      batteryCurrent: 1.8,
      batterySoc: 78.5,
      panelTemperature: 42.0,
      irradiance: 680.0,
      systemStatus: 'Normal',
      lastUpdated: new Date(),
    };

    // Constants for the 100Ah 12V demonstration battery storage
    this.batteryCapacityAh = 100.0;
    this.continuousLoadWatts = 25.0; // Simulated constant DC load (inverter, controller, comms)
  }

  /**
   * Initializes simulator state from DB or defaults and starts if configured
   */
  async init() {
    try {
      const res = await db.query('SELECT is_running, update_interval_seconds FROM simulation_state WHERE id = 1');
      if (res.rowCount > 0) {
        this.intervalSeconds = res.rows[0].update_interval_seconds || 3;
        const shouldRun = res.rows[0].is_running;
        if (shouldRun) {
          this.start();
        }
      } else {
        await db.query(
          'INSERT INTO simulation_state (id, is_running, update_interval_seconds, updated_at) VALUES (1, true, 3, NOW()) ON CONFLICT DO NOTHING'
        );
        this.start();
      }

      // Check if there is an existing latest telemetry reading in DB to resume smoothly
      const latestRes = await db.query('SELECT * FROM telemetry ORDER BY recorded_at DESC LIMIT 1');
      if (latestRes.rowCount > 0) {
        const row = latestRes.rows[0];
        this.state = {
          solarVoltage: parseFloat(row.solar_voltage),
          solarCurrent: parseFloat(row.solar_current),
          solarPower: parseFloat(row.solar_power),
          batteryVoltage: parseFloat(row.battery_voltage),
          batteryCurrent: parseFloat(row.battery_current),
          batterySoc: parseFloat(row.battery_soc),
          panelTemperature: parseFloat(row.panel_temperature),
          irradiance: parseFloat(row.irradiance),
          systemStatus: row.system_status,
          lastUpdated: new Date(row.recorded_at),
        };
      }
    } catch (err) {
      console.warn('[SimulationEngine] Initialization note (DB may be offline):', err.message);
      // Still start in-memory simulation so status can be inspected
      this.start();
    }
  }

  /**
   * Starts the simulation cycle
   */
  start() {
    if (this.isRunning && this.timer) {
      return { success: true, message: 'Simulator is already running' };
    }

    this.isRunning = true;
    this.timer = setInterval(() => this.tick(), this.intervalSeconds * 1000);
    console.log(`[SimulationEngine] Started with ${this.intervalSeconds}s interval.`);

    // Persist running state to DB asynchronously
    db.query('UPDATE simulation_state SET is_running = true, updated_at = NOW() WHERE id = 1').catch(() => {});

    return { success: true, message: `Simulator started (${this.intervalSeconds}s interval)` };
  }

  /**
   * Stops the simulation cycle
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[SimulationEngine] Stopped.');

    // Persist stopped state to DB
    db.query('UPDATE simulation_state SET is_running = false, updated_at = NOW() WHERE id = 1').catch(() => {});

    return { success: true, message: 'Simulator stopped' };
  }

  /**
   * Sets update interval in seconds and restarts timer
   */
  async setIntervalSeconds(seconds) {
    const sec = Math.max(1, Math.min(60, parseInt(seconds, 10) || 3));
    this.intervalSeconds = sec;

    if (this.isRunning) {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), this.intervalSeconds * 1000);
    }

    try {
      await db.query('UPDATE simulation_state SET update_interval_seconds = $1, updated_at = NOW() WHERE id = 1', [sec]);
    } catch (_) {}

    return { success: true, interval: this.intervalSeconds };
  }

  /**
   * Primary telemetry simulation step
   * Smooth physics-driven model
   */
  async tick() {
    if (this.isTicking) return; // Prevent overlapping ticks
    this.isTicking = true;

    try {
      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      // 1. Solar Irradiance Model (Diurnal Sun Profile)
      // Day is assumed between 6:00 and 18:30
      let targetIrradiance = 0;
      let isDaylight = false;

      if (hour >= 6.0 && hour <= 18.5) {
        isDaylight = true;
        const daylightFraction = (hour - 6.0) / 12.5; // 0 to 1
        const sunAngle = Math.sin(daylightFraction * Math.PI); // 0 at dawn/dusk, 1 at solar noon
        // Add realistic minor atmospheric fluctuation (e.g. passing light clouds)
        const cloudFactor = 1.0 + (Math.random() - 0.5) * 0.06;
        targetIrradiance = Math.max(0, Math.min(1000, sunAngle * 960 * cloudFactor));
      } else {
        targetIrradiance = 0;
      }

      // Smooth step towards target irradiance (exponential moving average)
      const alpha = 0.35;
      this.state.irradiance = Math.round((this.state.irradiance * (1 - alpha) + targetIrradiance * alpha) * 10) / 10;

      // 2. Solar Panel Voltage & Current
      if (isDaylight && this.state.irradiance > 15) {
        // PV characteristic: Voltage rises rapidly above open circuit threshold, current scales with irradiance
        const normIrr = this.state.irradiance / 1000.0;
        const targetV = 16.5 + normIrr * 4.8 + (Math.random() - 0.5) * 0.2;
        const targetI = normIrr * 4.7 + (Math.random() - 0.5) * 0.1;

        this.state.solarVoltage = Math.round((this.state.solarVoltage * 0.7 + targetV * 0.3) * 100) / 100;
        this.state.solarCurrent = Math.max(0, Math.round((this.state.solarCurrent * 0.7 + targetI * 0.3) * 100) / 100);
      } else {
        // Night: minimal open-circuit dark voltage, 0 current
        this.state.solarVoltage = Math.max(0, Math.round((this.state.solarVoltage * 0.8 + 0.4 * 0.2) * 100) / 100);
        this.state.solarCurrent = 0.0;
      }

      // 3. Solar Power (P = V * I) - strictly computed from voltage and current
      this.state.solarPower = Math.round(this.state.solarVoltage * this.state.solarCurrent * 100) / 100;

      // 4. Panel Temperature Model
      // Ambient temp ~22-26°C + solar heating proportional to irradiance
      const ambientTemp = 24.0 + Math.sin((hour / 24) * 2 * Math.PI) * 4.0;
      const thermalRise = (this.state.irradiance / 1000.0) * 38.0;
      const targetTemp = ambientTemp + thermalRise + (Math.random() - 0.5) * 0.5;
      this.state.panelTemperature = Math.round((this.state.panelTemperature * 0.85 + targetTemp * 0.15) * 10) / 10;

      // 5. Battery Charging / Discharging Model
      // Net power = Solar Generation - Continuous System Load
      const netPower = this.state.solarPower - this.continuousLoadWatts;
      const hoursElapsed = this.intervalSeconds / 3600.0;

      let estBatteryVoltage = this.state.batteryVoltage;
      if (estBatteryVoltage <= 0) estBatteryVoltage = 12.0;

      // Battery current: positive = charging into battery, negative = discharging into load
      const instantaneousBatteryCurrent = Math.round((netPower / estBatteryVoltage) * 100) / 100;
      this.state.batteryCurrent = instantaneousBatteryCurrent;

      // Update State of Charge (SoC) via Coulomb counting: ΔSoC = (I * Δt / Capacity) * 100%
      const deltaSoc = (instantaneousBatteryCurrent * hoursElapsed / this.batteryCapacityAh) * 100.0;
      let newSoc = this.state.batterySoc + deltaSoc;
      newSoc = Math.max(5.0, Math.min(100.0, newSoc));
      this.state.batterySoc = Math.round(newSoc * 10) / 10;

      // Battery Terminal Voltage Model based on SoC and Internal Resistance (IR drop)
      // Open Circuit Voltage: ~11.6V (at 0% SoC) to ~12.8V (at 100% SoC)
      const Voc = 11.6 + (this.state.batterySoc / 100.0) * 1.25;
      const internalResistance = 0.04; // ohms
      let targetVbatt = Voc + (this.state.batteryCurrent * internalResistance);
      // Clamp to realistic 12V lead-acid / LFP ranges (10.5V to 14.6V)
      targetVbatt = Math.max(10.5, Math.min(14.6, targetVbatt));
      this.state.batteryVoltage = Math.round((this.state.batteryVoltage * 0.8 + targetVbatt * 0.2) * 100) / 100;

      this.state.lastUpdated = now;

      // 6. Save Telemetry Reading to PostgreSQL
      const recordedAt = now;
      let systemStatus = 'Normal';

      // Evaluate alert thresholds first to determine system status
      try {
        systemStatus = await alertService.evaluateTelemetryAlerts(this.state);
        this.state.systemStatus = systemStatus;
      } catch (alertErr) {
        console.error('[SimulationEngine] Error evaluating alerts:', alertErr.message);
      }

      // Insert reading into PostgreSQL
      try {
        await db.query(
          `INSERT INTO telemetry 
           (solar_voltage, solar_current, solar_power, battery_voltage, battery_current, battery_soc, panel_temperature, irradiance, system_status, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            this.state.solarVoltage,
            this.state.solarCurrent,
            this.state.solarPower,
            this.state.batteryVoltage,
            this.state.batteryCurrent,
            this.state.batterySoc,
            this.state.panelTemperature,
            this.state.irradiance,
            this.state.systemStatus,
            recordedAt,
          ]
        );

        // Update last_generated_at in simulation_state
        await db.query('UPDATE simulation_state SET last_generated_at = $1, updated_at = NOW() WHERE id = 1', [recordedAt]);
      } catch (dbErr) {
        // Log PostgreSQL write error
        console.error('[SimulationEngine] PostgreSQL write error:', dbErr.message);
      }
    } catch (tickErr) {
      console.error('[SimulationEngine] Simulation tick error:', tickErr.message);
    } finally {
      this.isTicking = false;
    }
  }

  /**
   * Retrieves the latest simulated telemetry reading
   */
  getLatestTelemetry() {
    return {
      ...this.state,
      label: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
      batteryStatus: this.state.batteryCurrent > 0.1 ? 'Charging' : this.state.batteryCurrent < -0.1 ? 'Discharging' : 'Idle',
    };
  }

  /**
   * Returns current simulator operational status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalSeconds: this.intervalSeconds,
      lastUpdated: this.state.lastUpdated,
      simulationMode: 'Physics-Based Diurnal Solar PV & Battery Storage',
      hardwareStatus: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
    };
  }
}

// Singleton instance
const simulationEngine = new SimulationEngine();

module.exports = simulationEngine;
