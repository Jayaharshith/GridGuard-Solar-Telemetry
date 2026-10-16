const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, settingsController.updateSettings);
router.post('/reset-demo', authenticate, settingsController.resetDemoData);

module.exports = router;
