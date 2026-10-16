const db = require('../config/db');
const simulationEngine = require('../services/simulationEngine');

const DEFAULT_SETTINGS = {
  battery_low_voltage_warning: 11.5,
  battery_critical_voltage: 11.0,
  low_soc_warning: 20.0,
  critical_soc: 10.0,
  high_temp_warning: 65.0,
  low_irradiance_warning: 100.0,
  simulation_update_interval: 3,
  battery_rated_capacity_ah: 100,
  system_nominal_voltage: 12.0,
};

/**
 * GET /api/settings
 * Retrieves user-specific settings merged with system defaults
 */
async function getSettings(req, res) {
  try {
    const userId = req.user ? req.user.id : null;

    let querySql = 'SELECT setting_key, setting_value FROM system_settings';
    const params = [];
    if (userId) {
      querySql += ' WHERE user_id = $1 OR user_id IS NULL';
      params.push(userId);
    }

    const dbRes = await db.query(querySql, params);
    const settings = { ...DEFAULT_SETTINGS };

    for (const row of dbRes.rows) {
      const num = parseFloat(row.setting_value);
      settings[row.setting_key] = isNaN(num) ? row.setting_value : num;
    }

    // Include live simulation status
    const simStatus = simulationEngine.getStatus();

    return res.json({
      success: true,
      settings,
      simulation: simStatus,
    });
  } catch (err) {
    console.error('[SettingsController.getSettings] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings: ' + err.message,
    });
  }
}

/**
 * PUT /api/settings
 * Updates configuration settings in PostgreSQL
 */
async function updateSettings(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const newSettings = req.body.settings || req.body;

    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings payload must be an object' });
    }

    // Validate thresholds
    const allowedKeys = [
      'battery_low_voltage_warning',
      'battery_critical_voltage',
      'low_soc_warning',
      'critical_soc',
      'high_temp_warning',
      'low_irradiance_warning',
      'simulation_update_interval',
      'battery_rated_capacity_ah',
      'system_nominal_voltage',
    ];

    for (const [key, val] of Object.entries(newSettings)) {
      if (allowedKeys.includes(key)) {
        const numVal = parseFloat(val);
        if (isNaN(numVal) || numVal < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid numeric value for ${key}`,
          });
        }

        // Upsert into PostgreSQL
        await db.query(
          `INSERT INTO system_settings (user_id, setting_key, setting_value, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, setting_key)
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [userId, key, numVal.toString()]
        );

        // If interval changed, apply immediately to simulation engine
        if (key === 'simulation_update_interval') {
          await simulationEngine.setIntervalSeconds(numVal);
        }
      }
    }

    return res.json({
      success: true,
      message: 'Settings updated and saved to PostgreSQL successfully.',
    });
  } catch (err) {
    console.error('[SettingsController.updateSettings] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings: ' + err.message,
    });
  }
}

/**
 * POST /api/settings/reset-demo
 * Confirmed action to reset telemetry dataset to clean demonstration baseline
 */
async function resetDemoData(req, res) {
  try {
    const { confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation flag { confirmed: true } is required to reset demo dataset.',
      });
    }

    // Reset telemetry and alerts table
    await db.query('DELETE FROM telemetry');
    await db.query('DELETE FROM alerts');

    // Populate baseline 24-hour records
    const totalPoints = 60;
    const now = Date.now();
    const intervalMs = (24 * 3600 * 1000) / totalPoints;
    let soc = 80.0;

    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      const hour = timestamp.getHours() + timestamp.getMinutes() / 60;

      let irr = 0;
      let v = 12.0;
      let curr = 0;
      let temp = 25.0;

      if (hour >= 6.0 && hour <= 18.5) {
        const factor = Math.sin(((hour - 6.0) / 12.5) * Math.PI);
        irr = Math.round(factor * 950 * 10) / 10;
        v = Math.round((16.8 + factor * 4.5) * 100) / 100;
        curr = Math.round(factor * 4.5 * 100) / 100;
        temp = Math.round((26.0 + factor * 35.0) * 10) / 10;
      }

      const p = Math.round(v * curr * 100) / 100;
      const netP = p - 20.0;
      const battCurr = Math.round((netP / 12.5) * 100) / 100;
      soc = Math.max(15, Math.min(100, soc + (battCurr * (intervalMs / 3600000) / 100) * 100));
      const battV = Math.round((11.5 + (soc / 100) * 1.5) * 100) / 100;

      await db.query(
        `INSERT INTO telemetry 
         (solar_voltage, solar_current, solar_power, battery_voltage, battery_current, battery_soc, panel_temperature, irradiance, system_status, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Normal', $9)`,
        [v, curr, p, battV, battCurr, Math.round(soc * 10) / 10, temp, irr, timestamp]
      );
    }

    return res.json({
      success: true,
      message: 'Demo dataset reset successfully. Fresh telemetry baseline loaded.',
    });
  } catch (err) {
    console.error('[SettingsController.resetDemoData] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset demo dataset: ' + err.message,
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  resetDemoData,
};
