const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'gridguard_super_secret_jwt_key_2026_renewable_energy';

async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check Authorization Bearer header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // 2. Check HttpOnly cookie
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please log in again.',
      });
    }

    // Check user in PostgreSQL
    const userRes = await db.query(
      'SELECT id, full_name, username, email, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account not found. Please register or log in again.',
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication verification error. Please check database connection.',
    });
  }
}

module.exports = {
  authenticate,
  JWT_SECRET,
};
