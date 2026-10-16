const db = require('../config/db');
const simulationEngine = require('../services/simulationEngine');

/**
 * GET /api/battery/status
 * Detailed battery storage metrics and telemetry
 */
async function getBatteryStatus(req, res) {
  try {
    const latestRes = await db.query(
      'SELECT battery_voltage, battery_current, battery_soc, system_status, recorded_at FROM telemetry ORDER BY recorded_at DESC LIMIT 1'
    );

    let battVoltage, battCurrent, battSoc, recordedAt;

    if (latestRes.rowCount > 0) {
      const row = latestRes.rows[0];
      battVoltage = parseFloat(row.battery_voltage);
      battCurrent = parseFloat(row.battery_current);
      battSoc = parseFloat(row.battery_soc);
      recordedAt = row.recorded_at;
    } else {
      const sim = simulationEngine.getLatestTelemetry();
      battVoltage = sim.batteryVoltage;
      battCurrent = sim.batteryCurrent;
      battSoc = sim.batterySoc;
      recordedAt = sim.lastUpdated;
    }

    // Determine operational mode
    let chargingState = 'Idle';
    if (battCurrent > 0.1) {
      chargingState = 'Charging';
    } else if (battCurrent < -0.1) {
      chargingState = 'Discharging';
    }

    // Battery warnings
    let warningLevel = 'Normal';
    let warningMessage = 'Battery operating within safe electrical parameters.';
    if (battSoc < 10 || battVoltage < 11.0) {
      warningLevel = 'Critical';
      warningMessage = 'Critical low battery level! Immediate recharge required to prevent cell damage.';
    } else if (battSoc < 20 || battVoltage < 11.5) {
      warningLevel = 'Warning';
      warningMessage = 'Low battery reserve warning. Consider shedding non-critical loads.';
    }

    return res.json({
      success: true,
      battery: {
        voltage: battVoltage,
        current: battCurrent,
        powerWatts: Math.round(battVoltage * battCurrent * 100) / 100,
        socPercentage: battSoc,
        chargingState,
        warningLevel,
        warningMessage,
        recordedAt,
        ratedCapacityAh: 100,
        nominalVoltage: 12.0,
        chemistry: 'Simulated LiFePO4 / Deep-Cycle Lead-Acid',
        healthState: 'Simulated 98% SOH (Good)',
        modelDescription: 'Coulomb Counting integration with Voc-SoC curve and internal resistance overpotential calculation.',
        notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
      },
    });
  } catch (err) {
    console.error('[BatteryController.getBatteryStatus] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve battery status: ' + err.message,
    });
  }
}

/**
 * GET /api/battery/history
 * Battery voltage and SoC chronological history
 */
async function getBatteryHistory(req, res) {
  try {
    const { range = '24h' } = req.query;

    let interval = "INTERVAL '24 hours'";
    if (range === '15m') interval = "INTERVAL '15 minutes'";
    else if (range === '1h') interval = "INTERVAL '1 hour'";
    else if (range === '7d') interval = "INTERVAL '7 days'";

    const querySql = `
      SELECT id, recorded_at, battery_voltage::FLOAT, battery_current::FLOAT, battery_soc::FLOAT
      FROM telemetry
      WHERE recorded_at >= NOW() - ${interval}
      ORDER BY recorded_at ASC
    `;

    const result = await db.query(querySql);

    return res.json({
      success: true,
      range,
      count: result.rowCount,
      data: result.rows,
      notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
    });
  } catch (err) {
    console.error('[BatteryController.getBatteryHistory] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve battery history: ' + err.message,
    });
  }
}

module.exports = {
  getBatteryStatus,
  getBatteryHistory,
};
