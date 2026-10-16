const simulationEngine = require('../services/simulationEngine');

/**
 * GET /api/simulation/status
 */
function getStatus(req, res) {
  const status = simulationEngine.getStatus();
  return res.json({
    success: true,
    ...status,
  });
}

/**
 * POST /api/simulation/start
 */
function startSimulation(req, res) {
  const result = simulationEngine.start();
  return res.json(result);
}

/**
 * POST /api/simulation/stop
 */
function stopSimulation(req, res) {
  const result = simulationEngine.stop();
  return res.json(result);
}

module.exports = {
  getStatus,
  startSimulation,
  stopSimulation,
};
