const express = require('express');
const telemetryController = require('../controllers/telemetryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Private telemetry endpoints
router.get('/latest', authenticate, telemetryController.getLatest);
router.get('/history', authenticate, telemetryController.getHistory);
router.get('/stats', authenticate, telemetryController.getStats);
router.get('/export', authenticate, telemetryController.exportCsv);

module.exports = router;
