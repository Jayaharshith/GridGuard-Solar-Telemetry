const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../validators/authValidators');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for auth attempts to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
