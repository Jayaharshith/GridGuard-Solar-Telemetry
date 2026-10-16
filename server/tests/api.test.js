const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const simulationEngine = require('../src/services/simulationEngine');

describe('GridGuard Backend Comprehensive Test Suite', () => {
  let dbAvailable = false;
  let testUserToken = null;
  const testUsername = `tester_${Date.now()}`;
  const testEmail = `tester_${Date.now()}@gridguard.energy`;
  const testPassword = 'Password@123';

  before(async () => {
    // Check if PostgreSQL is accessible
    const health = await db.checkDbConnection();
    dbAvailable = health.success;
    console.log(`\n[Test Setup] Database available: ${dbAvailable}`);
    if (!dbAvailable) {
      console.log('[Test Setup] PostgreSQL not running locally; testing validation, security, and public endpoints.');
    }
  });

  after(async () => {
    simulationEngine.stop();
    await db.pool.end();
  });

  // 1. Health and Public Diagnostics
  describe('GET /api/health', () => {
    it('should return server status and database connectivity info', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok(res.body.simulationMode.includes('SIMULATED DATA'));
      assert.ok('database' in res.body);
    });
  });

  // 2. Authentication Validation & Protection
  describe('Authentication & Protected Route Guards', () => {
    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'short' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject registration if passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Test User',
          username: 'validuser',
          email: 'valid@example.com',
          password: 'Password@123',
          confirm_password: 'MismatchPassword',
        });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('match'));
    });

    it('should reject login with empty credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject access to protected endpoints without token (401)', async () => {
      const endpoints = [
        ['GET', '/api/auth/me'],
        ['GET', '/api/telemetry/latest'],
        ['GET', '/api/telemetry/history'],
        ['GET', '/api/telemetry/stats'],
        ['GET', '/api/telemetry/export'],
        ['GET', '/api/battery/status'],
        ['GET', '/api/battery/history'],
        ['GET', '/api/alerts'],
        ['GET', '/api/alerts/active'],
        ['GET', '/api/settings'],
        ['POST', '/api/simulation/start'],
        ['POST', '/api/simulation/stop'],
      ];

      for (const [method, path] of endpoints) {
        let reqObj;
        if (method === 'GET') reqObj = request(app).get(path);
        else reqObj = request(app).post(path);

        const res = await reqObj;
        assert.strictEqual(
          res.status,
          401,
          `Expected 401 for unauthenticated ${method} ${path}, got ${res.status}`
        );
      }
    });
  });

  // 3. Simulator Controls
  describe('Simulation Engine Lifecycle', () => {
    it('should report public simulation status without authentication', async () => {
      const res = await request(app).get('/api/simulation/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok('isRunning' in res.body);
      assert.ok('hardwareStatus' in res.body);
    });

    it('should generate realistic physics-based values where P = V * I', () => {
      const state = simulationEngine.getLatestTelemetry();
      assert.ok(state.solarVoltage >= 0);
      assert.ok(state.solarCurrent >= 0);
      const expectedPower = Math.round(state.solarVoltage * state.solarCurrent * 100) / 100;
      assert.strictEqual(
        Math.abs(state.solarPower - expectedPower) < 0.1,
        true,
        `Power ${state.solarPower} should equal V * I ${expectedPower}`
      );
    });
  });

  // 4. PostgreSQL Integration Tests (When DB is reachable)
  describe('Database Operations (Conditional on DB availability)', () => {
    it('should register a new user, reject duplicate, and log in with JWT', async (t) => {
      if (!dbAvailable) {
        t.skip('Skipping DB write test because PostgreSQL is offline.');
        return;
      }

      // 1. Register valid user
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Test Engineer',
          username: testUsername,
          email: testEmail,
          password: testPassword,
          confirm_password: testPassword,
        });

      assert.strictEqual(regRes.status, 201);
      assert.strictEqual(regRes.body.success, true);
      assert.ok(regRes.body.token);
      assert.strictEqual(regRes.body.user.username, testUsername);
      assert.strictEqual(regRes.body.user.password_hash, undefined); // Never return password hash!
      testUserToken = regRes.body.token;

      // 2. Reject duplicate username
      const dupRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Duplicate Guy',
          username: testUsername,
          email: `different_${Date.now()}@example.com`,
          password: testPassword,
          confirm_password: testPassword,
        });
      assert.strictEqual(dupRes.status, 409);

      // 3. Reject login with incorrect password
      const badLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUsername,
          password: 'WrongPassword!',
        });
      assert.strictEqual(badLogin.status, 401);

      // 4. Login with correct credentials
      const goodLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUsername,
          password: testPassword,
        });
      assert.strictEqual(goodLogin.status, 200);
      assert.ok(goodLogin.body.token);
    });

    it('should access protected telemetry endpoints with valid token', async (t) => {
      if (!dbAvailable || !testUserToken) {
        t.skip('Skipping DB read test because PostgreSQL/token is unavailable.');
        return;
      }

      // GET /api/telemetry/latest
      const latestRes = await request(app)
        .get('/api/telemetry/latest')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(latestRes.status, 200);
      assert.ok('telemetry' in latestRes.body);

      // GET /api/telemetry/history
      const historyRes = await request(app)
        .get('/api/telemetry/history?range=24h&limit=10')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(historyRes.status, 200);
      assert.ok(Array.isArray(historyRes.body.data));

      // GET /api/telemetry/stats (calculates energy)
      const statsRes = await request(app)
        .get('/api/telemetry/stats?range=24h')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(statsRes.status, 200);
      assert.ok('energy' in statsRes.body);

      // GET /api/telemetry/export (CSV file download)
      const csvRes = await request(app)
        .get('/api/telemetry/export?range=24h')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(csvRes.status, 200);
      assert.ok(csvRes.header['content-type'].includes('text/csv'));
    });

    it('should query and resolve alerts', async (t) => {
      if (!dbAvailable || !testUserToken) {
        t.skip('Skipping alert test because PostgreSQL/token is unavailable.');
        return;
      }

      const alertsRes = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(alertsRes.status, 200);
      assert.ok(Array.isArray(alertsRes.body.alerts));

      if (alertsRes.body.alerts.length > 0) {
        const firstId = alertsRes.body.alerts[0].id;
        const resolveRes = await request(app)
          .patch(`/api/alerts/${firstId}/resolve`)
          .set('Authorization', `Bearer ${testUserToken}`);
        assert.strictEqual(resolveRes.status, 200);
        assert.strictEqual(resolveRes.body.alert.status, 'resolved');
      }
    });

    it('should read and update user alert threshold settings', async (t) => {
      if (!dbAvailable || !testUserToken) {
        t.skip('Skipping settings test because PostgreSQL/token is unavailable.');
        return;
      }

      const getSettingsRes = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${testUserToken}`);
      assert.strictEqual(getSettingsRes.status, 200);
      assert.ok('settings' in getSettingsRes.body);

      const updateRes = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          settings: {
            battery_low_voltage_warning: 11.6,
            high_temp_warning: 68.0,
          },
        });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.success, true);
    });
  });
});
