const db = require('../config/db');

// Default fallback thresholds
const DEFAULT_THRESHOLDS = {
  battery_low_voltage_warning: 11.5,
  battery_critical_voltage: 11.0,
  low_soc_warning: 20.0,
  critical_soc: 10.0,
  high_temp_warning: 65.0,
  low_irradiance_warning: 100.0,
};

/**
 * Retrieves the current alert thresholds from database or defaults
 */
async function getThresholds(userId = null) {
  try {
    let queryText = 'SELECT setting_key, setting_value FROM system_settings';
    const params = [];
    if (userId) {
      queryText += ' WHERE user_id = $1 OR user_id IS NULL';
      params.push(userId);
    }
    const res = await db.query(queryText, params);
    const thresholds = { ...DEFAULT_THRESHOLDS };

    for (const row of res.rows) {
      const num = parseFloat(row.setting_value);
      if (!isNaN(num) && thresholds[row.setting_key] !== undefined) {
        thresholds[row.setting_key] = num;
      }
    }
    return thresholds;
  } catch (err) {
    console.warn('[AlertService] Using default thresholds due to DB read issue:', err.message);
    return DEFAULT_THRESHOLDS;
  }
}

/**
 * Evaluates telemetry reading against alert rules
 * Avoids spamming duplicate active alerts; updates or resolves automatically.
 */
async function evaluateTelemetryAlerts(telemetry) {
  const thresholds = await getThresholds();
  const activeAlerts = [];

  // Check 1: Critical Battery Voltage (< 11.0V)
  if (telemetry.battery_voltage < thresholds.battery_critical_voltage) {
    activeAlerts.push({
      type: 'battery_critical_voltage',
      severity: 'critical',
      message: `Critical Battery Voltage: Battery voltage has dropped to ${telemetry.battery_voltage}V (Threshold: < ${thresholds.battery_critical_voltage}V). Deep discharge imminent.`,
      measured: telemetry.battery_voltage,
      threshold: thresholds.battery_critical_voltage,
    });
  } else if (telemetry.battery_voltage < thresholds.battery_low_voltage_warning) {
    // Check 2: Low Battery Voltage Warning (< 11.5V)
    activeAlerts.push({
      type: 'battery_low_voltage',
      severity: 'warning',
      message: `Low Battery Voltage Warning: Battery voltage is ${telemetry.battery_voltage}V (Threshold: < ${thresholds.battery_low_voltage_warning}V).`,
      measured: telemetry.battery_voltage,
      threshold: thresholds.battery_low_voltage_warning,
    });
  }

  // Check 3: Critical State of Charge (< 10%)
  if (telemetry.battery_soc < thresholds.critical_soc) {
    activeAlerts.push({
      type: 'critical_soc',
      severity: 'critical',
      message: `Critical Battery State of Charge: SoC is at ${telemetry.battery_soc}% (Threshold: < ${thresholds.critical_soc}%). Load shedding recommended.`,
      measured: telemetry.battery_soc,
      threshold: thresholds.critical_soc,
    });
  } else if (telemetry.battery_soc < thresholds.low_soc_warning) {
    // Check 4: Low State of Charge Warning (< 20%)
    activeAlerts.push({
      type: 'low_soc',
      severity: 'warning',
      message: `Low Battery Reserve Warning: SoC has fallen to ${telemetry.battery_soc}% (Threshold: < ${thresholds.low_soc_warning}%).`,
      measured: telemetry.battery_soc,
      threshold: thresholds.low_soc_warning,
    });
  }

  // Check 5: High Panel Temperature (> 65°C)
  if (telemetry.panel_temperature > thresholds.high_temp_warning) {
    activeAlerts.push({
      type: 'high_temperature',
      severity: 'warning',
      message: `High Solar Panel Temperature: Cell temp reached ${telemetry.panel_temperature}°C (Threshold: > ${thresholds.high_temp_warning}°C). Efficiency derating active.`,
      measured: telemetry.panel_temperature,
      threshold: thresholds.high_temp_warning,
    });
  }

  // Check 6: Low Irradiance during peak daytime (between 10:00 and 15:00)
  const currentHour = new Date().getHours();
  if (currentHour >= 10 && currentHour <= 15 && telemetry.irradiance < thresholds.low_irradiance_warning) {
    activeAlerts.push({
      type: 'low_irradiance_daytime',
      severity: 'info',
      message: `Low Midday Solar Irradiance: Measured ${telemetry.irradiance} W/m² during peak sunshine hours (Threshold: < ${thresholds.low_irradiance_warning} W/m²). Cloud cover or shading detected.`,
      measured: telemetry.irradiance,
      threshold: thresholds.low_irradiance_warning,
    });
  }

  const activeTypes = new Set(activeAlerts.map(a => a.type));

  // Process triggered alerts in DB
  for (const alert of activeAlerts) {
    try {
      const existing = await db.query(
        "SELECT id FROM alerts WHERE alert_type = $1 AND status = 'active' LIMIT 1",
        [alert.type]
      );

      if (existing.rowCount === 0) {
        // Insert new active alert
        await db.query(
          `INSERT INTO alerts (alert_type, severity, message, measured_value, threshold_value, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'active', NOW())`,
          [alert.type, alert.severity, alert.message, alert.measured, alert.threshold]
        );
      } else {
        // Update measured value of existing active alert
        await db.query(
          `UPDATE alerts SET measured_value = $1 WHERE id = $2`,
          [alert.measured, existing.rows[0].id]
        );
      }
    } catch (err) {
      console.error('[AlertService] Error saving alert:', err.message);
    }
  }

  // Auto-resolve cleared alerts
  try {
    const existingActive = await db.query("SELECT id, alert_type FROM alerts WHERE status = 'active'");
    for (const row of existingActive.rows) {
      if (!activeTypes.has(row.alert_type)) {
        await db.query(
          "UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1",
          [row.id]
        );
      }
    }
  } catch (err) {
    console.error('[AlertService] Error resolving cleared alerts:', err.message);
  }

  // Compute overall system status based on highest severity
  if (activeAlerts.some(a => a.severity === 'critical')) return 'Critical';
  if (activeAlerts.some(a => a.severity === 'warning')) return 'Warning';
  return 'Normal';
}

module.exports = {
  getThresholds,
  evaluateTelemetryAlerts,
};
