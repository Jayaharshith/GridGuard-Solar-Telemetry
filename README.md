# GridGuard — Solar PV Array & Battery Storage Telemetry System

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2014%2B-blue.svg)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TailwindCSS%20%7C%20Recharts-cyan.svg)](https://react.dev/)
[![Status](https://img.shields.io/badge/Telemetry-Simulated%20Hardware-orange.svg)]()

> **NOTICE:** **SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED.**  
> GridGuard generates high-fidelity, physics-based telemetry for educational monitoring of a simulated photovoltaic (PV) array and 12V 100Ah battery storage system. All records are persisted and queried via **PostgreSQL**.

---

## 1. Project Overview & Architecture

GridGuard is an end-to-end full-stack supervisory and telemetry platform. It provides renewable-energy plant operators with a unified dashboard to monitor solar generation, battery state of charge (SoC), thermal parameters, alert notifications, and historical power trends.

```
+-------------------------------------------------------------------------------+
|                             React.js Web Client                               |
|        (Dashboard, Live Charts, Battery Monitor, Analytics, Alerts, History)   |
+---------------------------------------+---------------------------------------+
                                        | REST API / JSON Web Tokens
                                        v
+-------------------------------------------------------------------------------+
|                             Node.js & Express API                             |
|  - Rate-Limited Auth   - Simulation Service (3s)   - Alert Evaluation Engine  |
+---------------------------------------+---------------------------------------+
                                        | Parameterized SQL Queries (pg pool)
                                        v
+-------------------------------------------------------------------------------+
|                              PostgreSQL Database                              |
|  - users               - telemetry                 - alerts                   |
|  - system_settings     - simulation_state          - indexes & transactions   |
+-------------------------------------------------------------------------------+
```

### Key Technical Features

1. **Database-Backed Authentication**:
   - Operator registration and login verified against PostgreSQL.
   - Passwords hashed using `bcrypt` (10 salt rounds). Plain-text passwords and hashes are never exposed.
   - JWT tokens with expiry and HttpOnly cookie support.
2. **Realistic Solar & Battery Telemetry Engine**:
   - Diurnal solar irradiance model ($0 - 1000\text{ W/m}^2$) mirroring sunrise, solar noon, and sunset.
   - Strict adherence to Ohm's & Joule's laws: **$P = V \times I$** (power is never generated independently).
   - Coulomb counting battery model integrating charge/discharge currents against a 100Ah bank.
   - Thermal heating model based on ambient temperature and radiant solar flux.
3. **Persistent Alert Engine**:
   - Evaluates customizable thresholds (low voltage, critical voltage, low SoC, high temperature).
   - Deduplicates active warnings in PostgreSQL to prevent log flooding.
   - Automatically marks alerts as resolved when operating parameters return to safe bands.
4. **Energy Analytics**:
   - Uses **Trapezoidal Numerical Integration** ($\int P(t) \, dt$) over historical data points to calculate cumulative energy yield in $\text{Wh}$ or $\text{kWh}$, strictly distinguishing instantaneous power ($\text{W}$) from work performed ($\text{Wh}$).
5. **Interactive Recharts Visualizations**:
   - Multi-series real-time charts with custom tooltips, axis scaling, and range filtering ($15\text{m}$, $1\text{h}$, $24\text{h}$, $7\text{d}$).
6. **Data Export**:
   - One-click server-side CSV export of filtered historical telemetry records.

---

## 2. Directory Structure

```text
Project/
├── package.json              # Root workspace scripts (dev, test, db setup)
├── README.md                 # Project documentation and guide
├── server/                   # Backend Express & PostgreSQL Application
│   ├── package.json
│   ├── .env.example          # Environment variable template
│   ├── .env                  # Active local environment configuration
│   ├── schema.sql            # PostgreSQL DDL table definitions & indexes
│   ├── scripts/
│   │   ├── init-db.js        # Automated database & schema creator
│   │   └── seed-db.js        # Demo user & 24h telemetry curve seeder
│   ├── tests/
│   │   └── api.test.js       # Automated test suite (node:test + supertest)
│   └── src/
│       ├── app.js            # Express application middleware & routing
│       ├── server.js         # Server bootstrap & DB connection checker
│       ├── config/           # PostgreSQL connection pool (pg)
│       ├── controllers/      # Auth, telemetry, battery, alerts, settings
│       ├── middleware/       # JWT verification, error handling, rate limits
│       ├── routes/           # REST API route declarations
│       ├── services/         # Physics simulation & alert evaluation engines
│       └── validators/       # Input sanitation & schema validators
└── client/                   # Frontend React Application
    ├── package.json
    ├── vite.config.js        # Vite + Tailwind + API reverse proxy (/api)
    ├── index.html
    └── src/
        ├── App.jsx           # Master application container & router
        ├── main.jsx          # React DOM entry point
        ├── index.css         # Tailwind CSS styling
        ├── components/       # Metric cards, battery gauge, status badges, banners
        ├── context/          # Auth & PostgreSQL connectivity context
        ├── layouts/          # Top navigation bar, dark navy sidebar, layout wrapper
        ├── pages/            # Login, Register, Dashboard, Live, Battery, Analytics, etc.
        └── services/         # API fetch layer
```

---

## 3. PostgreSQL Database Schema

The database schema is fully defined in [`server/schema.sql`](server/schema.sql).

### Tables

1. **`users`**:
   - `id SERIAL PRIMARY KEY`
   - `full_name VARCHAR(100) NOT NULL`
   - `username VARCHAR(50) UNIQUE NOT NULL`
   - `email VARCHAR(100) UNIQUE NOT NULL`
   - `password_hash VARCHAR(255) NOT NULL`
   - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
2. **`telemetry`**:
   - `id BIGSERIAL PRIMARY KEY`
   - `solar_voltage NUMERIC(6,2) NOT NULL CHECK (solar_voltage >= 0)`
   - `solar_current NUMERIC(6,2) NOT NULL CHECK (solar_current >= 0)`
   - `solar_power NUMERIC(8,2) NOT NULL CHECK (solar_power >= 0)`
   - `battery_voltage NUMERIC(6,2) NOT NULL CHECK (battery_voltage >= 0)`
   - `battery_current NUMERIC(6,2) NOT NULL`
   - `battery_soc NUMERIC(5,2) NOT NULL CHECK (battery_soc BETWEEN 0 AND 100)`
   - `panel_temperature NUMERIC(5,2) NOT NULL`
   - `irradiance NUMERIC(7,2) NOT NULL CHECK (irradiance >= 0)`
   - `system_status VARCHAR(20) DEFAULT 'Normal'`
   - `recorded_at TIMESTAMPTZ NOT NULL`
   - *Indexes:* `idx_telemetry_recorded_at (recorded_at DESC)`, `idx_telemetry_status (system_status)`
3. **`alerts`**:
   - `id SERIAL PRIMARY KEY`
   - `alert_type VARCHAR(50)`, `severity VARCHAR(20)`, `message TEXT`
   - `measured_value NUMERIC(8,2)`, `threshold_value NUMERIC(8,2)`
   - `status VARCHAR(20) DEFAULT 'active'`, `created_at TIMESTAMPTZ`, `resolved_at TIMESTAMPTZ`
   - *Indexes:* `idx_alerts_status`, `idx_alerts_created_at`, `idx_alerts_type`
4. **`system_settings`**:
   - `id SERIAL PRIMARY KEY`, `user_id INT REFERENCES users(id)`
   - `setting_key VARCHAR(100)`, `setting_value TEXT`, `updated_at TIMESTAMPTZ`
   - *Constraint:* `UNIQUE (user_id, setting_key)`
5. **`simulation_state`**:
   - `id SERIAL PRIMARY KEY`, `is_running BOOLEAN`, `update_interval_seconds INT`
   - `last_generated_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`

---

## 4. Setup & Execution Instructions

### Prerequisites
- **Node.js** (v18 or higher; tested on v24)
- **PostgreSQL** (v12 or higher installed locally or via Docker/cloud provider)

---

### Step 1: Configure Environment Variables

Navigate to the `server/` directory and configure `.env` (or copy `.env.example`):

```bash
cd server
cp .env.example .env
```

Edit `server/.env` to match your local PostgreSQL credentials:

```ini
PORT=5000
NODE_ENV=development

# PostgreSQL Connection Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gridguard
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Authentication Secret
JWT_SECRET=gridguard_super_secret_jwt_key_2026_renewable_energy
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:5173
SIMULATION_INTERVAL_SECONDS=3
AUTO_START_SIMULATION=true
```

---

### Step 2: Initialize & Seed the PostgreSQL Database

Run the automated database creator and schema script:

```bash
# Inside server/ directory:
npm run db:init
```
*Output: Connects to PostgreSQL, creates database `gridguard` if missing, and executes all DDL queries in `schema.sql`.*

Seed baseline demo users and a 24-hour diurnal telemetry history:

```bash
npm run db:seed
```

> **Default Seeded Credentials:**  
> - **Username:** `admin`  
> - **Password:** `Admin@1234`  
> *(Alternative Operator: `operator` / `Operator@1234`)*

---

### Step 3: Start the Application

You can start both backend and frontend concurrently from the root directory:

```bash
# In the root project directory:
npm run dev
```

Or start them individually:

```bash
# Terminal 1 - Backend Express Server (Port 5000)
cd server
npm run dev

# Terminal 2 - Frontend React Client (Port 5173)
cd client
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 5. Demonstration SQL Verification Queries

To evaluate and verify the PostgreSQL database during examination or review, connect via `psql` or pgAdmin and run these queries:

### 1. View Latest Telemetry Reading
```sql
SELECT id, recorded_at, solar_voltage, solar_current, solar_power, 
       battery_voltage, battery_soc, system_status
FROM telemetry
ORDER BY recorded_at DESC
LIMIT 1;
```

### 2. View Telemetry History (Last 1 Hour)
```sql
SELECT id, recorded_at, solar_power, irradiance, battery_soc
FROM telemetry
WHERE recorded_at >= NOW() - INTERVAL '1 hour'
ORDER BY recorded_at DESC;
```

### 3. Inspect Active Supervisory Alerts
```sql
SELECT id, alert_type, severity, message, measured_value, threshold_value, created_at
FROM alerts
WHERE status = 'active'
ORDER BY created_at DESC;
```

### 4. Verify Registered Users (Passwords Securely Hashed)
```sql
SELECT id, full_name, username, email, created_at, 
       LEFT(password_hash, 20) || '...' AS password_hash_preview
FROM users
ORDER BY created_at DESC;
```

### 5. Count Total Telemetry Readings Stored
```sql
SELECT COUNT(*) AS total_telemetry_readings FROM telemetry;
```

### 6. Calculate Average Solar Power & Peak Generation (Last 24 Hours)
```sql
SELECT 
    ROUND(AVG(solar_power), 2) AS avg_solar_power_watts,
    ROUND(MAX(solar_power), 2) AS max_solar_power_watts,
    ROUND(AVG(irradiance), 2) AS avg_irradiance_wm2
FROM telemetry
WHERE recorded_at >= NOW() - INTERVAL '24 hours';
```

---

## 6. Testing Plan & Results

The automated test suite is located in [`server/tests/api.test.js`](server/tests/api.test.js).  
To run the automated test suite:

```bash
cd server
npm test
```

### Actual Test Run Results

```text
> gridguard-server@1.0.0 test
> node --test tests/*.test.js

GET /api/health 200 - Server health check
▶ GridGuard Backend Comprehensive Test Suite
  ▶ GET /api/health
    ✔ should return server status and database connectivity info
  ▶ Authentication & Protected Route Guards
    ✔ should reject registration with missing fields
    ✔ should reject registration if passwords do not match
    ✔ should reject login with empty credentials
    ✔ should reject access to protected endpoints without token (401)
  ▶ Simulation Engine Lifecycle
    ✔ should report public simulation status without authentication
    ✔ should generate realistic physics-based values where P = V * I
  ▶ Database Operations (Active when PostgreSQL is running)
    ✔ should register a new user, reject duplicate, and log in with JWT
    ✔ should access protected telemetry endpoints with valid token
    ✔ should query and resolve alerts
    ✔ should read and update user alert threshold settings
✔ 11 tests executed cleanly (0 failures)
```

---

## 7. Troubleshooting Common Issues

1. **PostgreSQL Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)**:
   - Ensure the PostgreSQL service is running:
     - *Windows PowerShell:* `Get-Service -Name "*postgres*"` or launch PostgreSQL from Windows Services (`services.msc`).
     - *Linux/macOS:* `sudo service postgresql status` or `brew services list`.
   - Verify that the port and password in `server/.env` match your PostgreSQL installation.
2. **Port 5000 Already in Use**:
   - Change `PORT=5001` in `server/.env`. Vite's proxy in `client/vite.config.js` will automatically redirect requests.
3. **Database Fallback Behavior**:
   - As mandated by assessment criteria, the application **never silently falls back to in-memory storage**. If PostgreSQL is offline, a prominent banner appears on the dashboard displaying diagnostic codes and local connection commands.
