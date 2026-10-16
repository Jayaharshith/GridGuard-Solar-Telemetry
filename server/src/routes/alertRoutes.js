const express = require('express');
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, alertController.getAllAlerts);
router.get('/active', authenticate, alertController.getActiveAlerts);
router.patch('/:id/resolve', authenticate, alertController.resolveAlert);

module.exports = router;
