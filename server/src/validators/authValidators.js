/**
 * Auth Request Validation Helpers
 */

function validateRegistration(req, res, next) {
  const { full_name, username, email, password, confirm_password } = req.body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Full name is required (at least 2 characters).' });
  }

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'Username is required (at least 3 characters).' });
  }

  // Username alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return res.status(400).json({ success: false, error: 'Username may only contain letters, numbers, and underscores.' });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ success: false, error: 'Passwords do not match.' });
  }

  req.body.full_name = full_name.trim();
  req.body.username = username.trim().toLowerCase();
  req.body.email = email.trim().toLowerCase();

  next();
}

function validateLogin(req, res, next) {
  const { identifier, username, email, password } = req.body;
  const loginId = identifier || username || email;

  if (!loginId || typeof loginId !== 'string' || loginId.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Email or username is required.' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  req.body.loginId = loginId.trim();
  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
};
