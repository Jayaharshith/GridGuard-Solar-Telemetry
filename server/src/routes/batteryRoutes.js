const express = require('express');
const batteryController = require('../controllers/batteryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', authenticate, batteryController.getBatteryStatus);
router.get('/history', authenticate, batteryController.getBatteryHistory);

module.exports = router;
