-- =============================================================================
-- GridGuard: Solar PV Array & Battery Storage Telemetry
-- PostgreSQL Database Schema Initialization
-- =============================================================================

-- Drop tables in reverse dependency order if recreating
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS telemetry CASCADE;
DROP TABLE IF EXISTS simulation_state CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- -----------------------------------------------------------------------------
-- 2. Telemetry Table
-- -----------------------------------------------------------------------------
CREATE TABLE telemetry (
    id BIGSERIAL PRIMARY KEY,
    solar_voltage NUMERIC(6, 2) NOT NULL CHECK (solar_voltage >= 0),
    solar_current NUMERIC(6, 2) NOT NULL CHECK (solar_current >= 0),
    solar_power NUMERIC(8, 2) NOT NULL CHECK (solar_power >= 0),
    battery_voltage NUMERIC(6, 2) NOT NULL CHECK (battery_voltage >= 0),
    battery_current NUMERIC(6, 2) NOT NULL,
    battery_soc NUMERIC(5, 2) NOT NULL CHECK (battery_soc >= 0 AND battery_soc <= 100),
    panel_temperature NUMERIC(5, 2) NOT NULL,
    irradiance NUMERIC(7, 2) NOT NULL CHECK (irradiance >= 0),
    system_status VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (system_status IN ('Normal', 'Warning', 'Critical')),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_telemetry_recorded_at ON telemetry (recorded_at DESC);
CREATE INDEX idx_telemetry_status ON telemetry (system_status);

-- -----------------------------------------------------------------------------
-- 3. Alerts Table
-- -----------------------------------------------------------------------------
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    measured_value NUMERIC(8, 2) NOT NULL,
    threshold_value NUMERIC(8, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_status ON alerts (status);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX idx_alerts_type ON alerts (alert_type);

-- -----------------------------------------------------------------------------
-- 4. System Settings Table
-- -----------------------------------------------------------------------------
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_setting UNIQUE (user_id, setting_key)
);

CREATE INDEX idx_settings_user ON system_settings (user_id);
CREATE INDEX idx_settings_key ON system_settings (setting_key);

-- -----------------------------------------------------------------------------
-- 5. Simulation State Table
-- -----------------------------------------------------------------------------
CREATE TABLE simulation_state (
    id SERIAL PRIMARY KEY,
    is_running BOOLEAN NOT NULL DEFAULT true,
    update_interval_seconds INTEGER NOT NULL DEFAULT 3 CHECK (update_interval_seconds >= 1 AND update_interval_seconds <= 60),
    last_generated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Initialize default single-row simulation state
INSERT INTO simulation_state (id, is_running, update_interval_seconds, last_generated_at, updated_at)
VALUES (1, true, 3, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
