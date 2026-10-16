const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const db = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const batteryRoutes = require('./routes/batteryRoutes');
const alertRoutes = require('./routes/alertRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible dashboard asset loading
}));

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health and Diagnostic Endpoint
app.get('/api/health', async (req, res) => {
  const dbHealth = await db.checkDbConnection();
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GridGuard Telemetry Server',
    database: dbHealth,
    simulationMode: 'SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED',
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/battery', batteryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/simulation', simulationRoutes);

// Catch-all 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
