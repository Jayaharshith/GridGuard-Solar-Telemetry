const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new user in PostgreSQL
 */
async function register(req, res) {
  const { full_name, username, email, password } = req.body;

  try {
    // Check if username or email already exists in PostgreSQL
    const existingCheck = await db.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingCheck.rowCount > 0) {
      const match = existingCheck.rows[0];
      if (match.username === username) {
        return res.status(409).json({ success: false, error: 'Username is already registered. Please choose another.' });
      }
      if (match.email === email) {
        return res.status(409).json({ success: false, error: 'Email is already registered. Please log in or use another email.' });
      }
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into PostgreSQL
    const insertRes = await db.query(
      `INSERT INTO users (full_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, username, email, created_at`,
      [full_name, username, email, passwordHash]
    );

    const user = insertRes.rows[0];

    // Seed default settings for the new user
    const defaultSettings = [
      ['battery_low_voltage_warning', '11.5'],
      ['battery_critical_voltage', '11.0'],
      ['low_soc_warning', '20.0'],
      ['critical_soc', '10.0'],
      ['high_temp_warning', '65.0'],
      ['low_irradiance_warning', '100.0'],
      ['simulation_update_interval', '3']
    ];

    for (const [key, val] of defaultSettings) {
      await db.query(
        `INSERT INTO system_settings (user_id, setting_key, setting_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, setting_key) DO NOTHING`,
        [user.id, key, val]
      );
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to GridGuard.',
      user,
      token,
    });
  } catch (err) {
    console.error('[AuthController.register] Database Error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Username or email already exists in the database.' });
    }
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a database error: ' + err.message,
    });
  }
}

/**
 * Authenticate existing user against PostgreSQL
 */
async function login(req, res) {
  const { loginId, password } = req.body;

  try {
    // Find user by username OR email
    const userRes = await db.query(
      `SELECT id, full_name, username, email, password_hash, created_at 
       FROM users 
       WHERE username = $1 OR email = $1`,
      [loginId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username/email or password.',
      });
    }

    const user = userRes.rows[0];

    // Verify bcrypt password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username/email or password.',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Return safe user object (never return password_hash)
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    };

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('[AuthController.login] Database Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to database connection error: ' + err.message,
    });
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user,
  });
}

/**
 * Log out user by clearing cookie
 */
async function logout(req, res) {
  res.clearCookie('token');
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

module.exports = {
  register,
  login,
  getMe,
  logout,
};
