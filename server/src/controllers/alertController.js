const db = require('../config/db');

/**
 * GET /api/alerts
 * Lists alerts (active and resolved)
 */
async function getAllAlerts(req, res) {
  try {
    const { status, severity, limit = 100 } = req.query;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (severity && severity !== 'all') {
      whereConditions.push(`severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT id, alert_type, severity, message, measured_value::FLOAT, threshold_value::FLOAT, 
             status, created_at, resolved_at
      FROM alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await db.query(sql, [...params, parseInt(limit, 10)]);

    return res.json({
      success: true,
      count: result.rowCount,
      alerts: result.rows,
      notice: 'SOFTWARE SIMULATION ALERTS — NOT HARDWARE PROTECTION CIRCUITS',
    });
  } catch (err) {
    console.error('[AlertController.getAllAlerts] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts: ' + err.message,
    });
  }
}

/**
 * GET /api/alerts/active
 * Lists only currently active alerts
 */
async function getActiveAlerts(req, res) {
  try {
    const sql = `
      SELECT id, alert_type, severity, message, measured_value::FLOAT, threshold_value::FLOAT, 
             status, created_at
      FROM alerts
      WHERE status = 'active'
      ORDER BY created_at DESC
    `;

    const result = await db.query(sql);

    return res.json({
      success: true,
      count: result.rowCount,
      alerts: result.rows,
      notice: 'SOFTWARE SIMULATION ALERTS — NOT HARDWARE PROTECTION CIRCUITS',
    });
  } catch (err) {
    console.error('[AlertController.getActiveAlerts] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve active alerts: ' + err.message,
    });
  }
}

/**
 * PATCH /api/alerts/:id/resolve
 * Marks a specific alert as resolved
 */
async function resolveAlert(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE alerts 
       SET status = 'resolved', resolved_at = NOW() 
       WHERE id = $1 
       RETURNING id, alert_type, status, resolved_at`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found with ID ' + id,
      });
    }

    return res.json({
      success: true,
      message: 'Alert has been marked as resolved.',
      alert: result.rows[0],
    });
  } catch (err) {
    console.error('[AlertController.resolveAlert] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve alert: ' + err.message,
    });
  }
}

module.exports = {
  getAllAlerts,
  getActiveAlerts,
  resolveAlert,
};
