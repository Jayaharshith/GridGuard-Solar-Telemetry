const db = require('../config/db');
const simulationEngine = require('../services/simulationEngine');

/**
 * GET /api/telemetry/latest
 * Retrieves the latest recorded telemetry reading
 */
async function getLatest(req, res) {
  try {
    const dbRes = await db.query(
      'SELECT * FROM telemetry ORDER BY recorded_at DESC LIMIT 1'
    );

    if (dbRes.rowCount > 0) {
      const row = dbRes.rows[0];
      return res.json({
        success: true,
        source: 'postgresql',
        telemetry: {
          id: row.id,
          solar_voltage: parseFloat(row.solar_voltage),
          solar_current: parseFloat(row.solar_current),
          solar_power: parseFloat(row.solar_power),
          battery_voltage: parseFloat(row.battery_voltage),
          battery_current: parseFloat(row.battery_current),
          battery_soc: parseFloat(row.battery_soc),
          panel_temperature: parseFloat(row.panel_temperature),
          irradiance: parseFloat(row.irradiance),
          system_status: row.system_status,
          recorded_at: row.recorded_at,
          notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
        },
      });
    }

    // Fallback to active simulation engine state if table is newly created
    const simState = simulationEngine.getLatestTelemetry();
    return res.json({
      success: true,
      source: 'simulation_memory',
      telemetry: {
        solar_voltage: simState.solarVoltage,
        solar_current: simState.solarCurrent,
        solar_power: simState.solarPower,
        battery_voltage: simState.batteryVoltage,
        battery_current: simState.batteryCurrent,
        battery_soc: simState.batterySoc,
        panel_temperature: simState.panelTemperature,
        irradiance: simState.irradiance,
        system_status: simState.systemStatus,
        recorded_at: simState.lastUpdated,
        notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
      },
    });
  } catch (err) {
    console.error('[TelemetryController.getLatest] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve latest telemetry from PostgreSQL: ' + err.message,
    });
  }
}

/**
 * GET /api/telemetry/history
 * Query parameters:
 *  - range: '15m', '1h', '24h', '7d', 'all'
 *  - page: number (default 1)
 *  - limit: number (default 50)
 *  - status: 'All', 'Normal', 'Warning', 'Critical'
 *  - startDate, endDate
 */
async function getHistory(req, res) {
  try {
    const { range, page = 1, limit = 50, status, startDate, endDate, sort = 'DESC' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(5, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    // Time range filter
    if (startDate && endDate) {
      whereConditions.push(`recorded_at >= $${paramIndex} AND recorded_at <= $${paramIndex + 1}`);
      params.push(new Date(startDate), new Date(endDate));
      paramIndex += 2;
    } else if (range === '15m') {
      whereConditions.push(`recorded_at >= NOW() - INTERVAL '15 minutes'`);
    } else if (range === '1h') {
      whereConditions.push(`recorded_at >= NOW() - INTERVAL '1 hour'`);
    } else if (range === '24h' || !range) {
      whereConditions.push(`recorded_at >= NOW() - INTERVAL '24 hours'`);
    } else if (range === '7d') {
      whereConditions.push(`recorded_at >= NOW() - INTERVAL '7 days'`);
    }

    // Status filter
    if (status && status !== 'All') {
      whereConditions.push(`system_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderDirection = sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Total count query
    const countSql = `SELECT COUNT(*) AS total FROM telemetry ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Records query
    const dataSql = `
      SELECT id, 
             solar_voltage::FLOAT, 
             solar_current::FLOAT, 
             solar_power::FLOAT, 
             battery_voltage::FLOAT, 
             battery_current::FLOAT, 
             battery_soc::FLOAT, 
             panel_temperature::FLOAT, 
             irradiance::FLOAT, 
             system_status, 
             recorded_at
      FROM telemetry
      ${whereClause}
      ORDER BY recorded_at ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataRes = await db.query(dataSql, [...params, limitNum, offset]);

    return res.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
    });
  } catch (err) {
    console.error('[TelemetryController.getHistory] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve telemetry history from PostgreSQL: ' + err.message,
    });
  }
}

/**
 * GET /api/telemetry/stats
 * Computes energy generated via numerical approximation (trapezoidal integration)
 * along with statistical aggregates.
 */
async function getStats(req, res) {
  try {
    const { range = '24h' } = req.query;

    let intervalClause = "INTERVAL '24 hours'";
    if (range === '15m') intervalClause = "INTERVAL '15 minutes'";
    else if (range === '1h') intervalClause = "INTERVAL '1 hour'";
    else if (range === '7d') intervalClause = "INTERVAL '7 days'";

    // 1. Fetch statistical aggregates
    const statsQuery = `
      SELECT 
        COUNT(*) AS reading_count,
        COALESCE(AVG(solar_power), 0)::FLOAT AS avg_solar_power,
        COALESCE(MAX(solar_power), 0)::FLOAT AS max_solar_power,
        COALESCE(MIN(solar_power), 0)::FLOAT AS min_solar_power,
        COALESCE(AVG(panel_temperature), 0)::FLOAT AS avg_panel_temp,
        COALESCE(MAX(panel_temperature), 0)::FLOAT AS max_panel_temp,
        COALESCE(AVG(irradiance), 0)::FLOAT AS avg_irradiance,
        COALESCE(MAX(irradiance), 0)::FLOAT AS max_irradiance,
        COALESCE(AVG(battery_soc), 0)::FLOAT AS avg_battery_soc,
        COALESCE(MIN(battery_soc), 0)::FLOAT AS min_battery_soc,
        COALESCE(MAX(battery_soc), 0)::FLOAT AS max_battery_soc
      FROM telemetry
      WHERE recorded_at >= NOW() - ${intervalClause}
    `;

    const statsRes = await db.query(statsQuery);
    const stats = statsRes.rows[0];

    // 2. Fetch chronologically ordered points for Trapezoidal Numerical Integration of Energy:
    // Energy (Watt-hours) = ∫ P(t) dt ≈ Σ [ (P_{i} + P_{i-1}) / 2 * (t_i - t_{i-1}) in hours ]
    const pointsQuery = `
      SELECT solar_power::FLOAT, recorded_at
      FROM telemetry
      WHERE recorded_at >= NOW() - ${intervalClause}
      ORDER BY recorded_at ASC
    `;
    const pointsRes = await db.query(pointsQuery);
    const points = pointsRes.rows;

    let energyWh = 0;
    if (points.length >= 2) {
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const dtHours = (new Date(curr.recorded_at) - new Date(prev.recorded_at)) / (1000 * 3600);
        // Only integrate if gap between successive samples is reasonable (e.g. < 2 hours)
        if (dtHours > 0 && dtHours < 2) {
          const avgPower = (prev.solar_power + curr.solar_power) / 2.0;
          energyWh += avgPower * dtHours;
        }
      }
    }

    const energyKWh = energyWh / 1000.0;

    return res.json({
      success: true,
      range,
      hasEnoughData: points.length >= 2,
      totalReadings: parseInt(stats.reading_count, 10),
      energy: {
        wattHours: Math.round(energyWh * 100) / 100,
        kiloWattHours: Math.round(energyKWh * 1000) / 1000,
        formatted: energyWh >= 1000 ? `${(energyWh / 1000).toFixed(3)} kWh` : `${energyWh.toFixed(1)} Wh`,
        method: 'Trapezoidal Numerical Integration over historical sample intervals',
      },
      solar: {
        avgPowerWatts: Math.round(stats.avg_solar_power * 10) / 10,
        maxPowerWatts: Math.round(stats.max_solar_power * 10) / 10,
        minPowerWatts: Math.round(stats.min_solar_power * 10) / 10,
        avgIrradiance: Math.round(stats.avg_irradiance * 10) / 10,
        maxIrradiance: Math.round(stats.max_irradiance * 10) / 10,
        avgTemperature: Math.round(stats.avg_panel_temp * 10) / 10,
        maxTemperature: Math.round(stats.max_panel_temp * 10) / 10,
      },
      battery: {
        avgSoc: Math.round(stats.avg_battery_soc * 10) / 10,
        minSoc: Math.round(stats.min_battery_soc * 10) / 10,
        maxSoc: Math.round(stats.max_battery_soc * 10) / 10,
      },
      notice: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
    });
  } catch (err) {
    console.error('[TelemetryController.getStats] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate telemetry stats: ' + err.message,
    });
  }
}

/**
 * GET /api/telemetry/export
 * Exports telemetry records to CSV format
 */
async function exportCsv(req, res) {
  try {
    const { range = '24h', status } = req.query;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (range === '15m') whereConditions.push(`recorded_at >= NOW() - INTERVAL '15 minutes'`);
    else if (range === '1h') whereConditions.push(`recorded_at >= NOW() - INTERVAL '1 hour'`);
    else if (range === '24h') whereConditions.push(`recorded_at >= NOW() - INTERVAL '24 hours'`);
    else if (range === '7d') whereConditions.push(`recorded_at >= NOW() - INTERVAL '7 days'`);

    if (status && status !== 'All') {
      whereConditions.push(`system_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const querySql = `
      SELECT id, recorded_at, solar_voltage, solar_current, solar_power, 
             battery_voltage, battery_current, battery_soc, panel_temperature, 
             irradiance, system_status
      FROM telemetry
      ${whereClause}
      ORDER BY recorded_at DESC
      LIMIT 5000
    `;

    const dataRes = await db.query(querySql, params);

    // Format CSV
    const headers = [
      'Record ID',
      'Timestamp (ISO)',
      'Solar Voltage (V)',
      'Solar Current (A)',
      'Solar Power (W)',
      'Battery Voltage (V)',
      'Battery Current (A)',
      'Battery SoC (%)',
      'Panel Temperature (°C)',
      'Irradiance (W/m²)',
      'System Status',
    ];

    const rows = dataRes.rows.map(r => [
      r.id,
      new Date(r.recorded_at).toISOString(),
      parseFloat(r.solar_voltage).toFixed(2),
      parseFloat(r.solar_current).toFixed(2),
      parseFloat(r.solar_power).toFixed(2),
      parseFloat(r.battery_voltage).toFixed(2),
      parseFloat(r.battery_current).toFixed(2),
      parseFloat(r.battery_soc).toFixed(1),
      parseFloat(r.panel_temperature).toFixed(1),
      parseFloat(r.irradiance).toFixed(1),
      r.system_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gridguard-telemetry-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('[TelemetryController.exportCsv] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to export CSV: ' + err.message,
    });
  }
}

module.exports = {
  getLatest,
  getHistory,
  getStats,
  exportCsv,
};
