const express = require('express');
const simulationController = require('../controllers/simulationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', simulationController.getStatus);
router.post('/start', authenticate, simulationController.startSimulation);
router.post('/stop', authenticate, simulationController.stopSimulation);

module.exports = router;
