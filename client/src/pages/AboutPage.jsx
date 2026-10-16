import React from 'react';
import {
  Sun,
  Database,
  Cpu,
  Layers,
  Code2,
  ShieldCheck,
  Zap,
  Radio,
  FileCode,
  Wifi,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Sun className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Grid<span className="text-emerald-600">Guard</span>: Solar PV Array & Battery Storage Telemetry
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Academic Full-Stack Web Development Project • Renewable Energy Domain
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mt-4">
          GridGuard is an end-to-end full-stack telemetry monitoring and supervisory control system designed for photovoltaic (PV) solar arrays and energy storage battery systems.
          The project provides real-time electrical analytics, battery state estimation, threshold violation alerts, and persistent PostgreSQL historical telemetry logging.
        </p>
      </div>

      {/* Domain & Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2>Project Objectives</h2>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li>Ingest and display high-frequency telemetry from a simulated solar PV string and 12V storage bank.</li>
            <li>Maintain database-backed user authentication and personalized supervisory settings.</li>
            <li>Implement rigorous physical models where power is strictly derived ($P = V \times I$).</li>
            <li>Calculate true energy generation using numerical integration rather than instantaneous power.</li>
            <li>Automate threshold evaluation with alert deduplication and auto-resolution in PostgreSQL.</li>
            <li>Export historical time-series datasets to CSV for offline analytical auditing.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-3">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h2>Full-Stack Technology Stack</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700">Frontend:</span>
              <span className="text-slate-600">React.js (Vite, Hooks, Tailwind CSS)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700">Data Visualization:</span>
              <span className="text-slate-600">Recharts (Area, Line, Responsive SVG)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700">Backend API:</span>
              <span className="text-slate-600">Node.js & Express.js REST Framework</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700">Database Engine:</span>
              <span className="text-slate-600 font-mono font-medium text-emerald-700">PostgreSQL (node-postgres / pg)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700">Authentication:</span>
              <span className="text-slate-600">bcrypt password hashing & JSON Web Tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Mathematical Engine */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h2>Simulated Telemetry Mathematical Model</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Because no physical solar panel or lithium battery pack is connected, a server-side physics engine generates continuous, smoothly evolving telemetry readings:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">1. Diurnal Sun Profile</span>
            <span className="text-slate-600">
              G(t) = G_peak × sin((t - 6) / 12.5 × π)<br />
              Modeled between 06:00 and 18:30 with atmospheric cloud noise.
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">2. Strict Power Law</span>
            <span className="text-slate-600">
              P = V_pv × I_pv<br />
              Power is never independent; current scales directly with irradiance.
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">3. Coulomb Counting SoC</span>
            <span className="text-slate-600">
              ΔSoC = (I_batt × Δt / C_nom) × 100%<br />
              V_term = V_oc(SoC) + I_batt × R_int
            </span>
          </div>
        </div>
      </div>

      {/* Database Schema Architecture */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
          <Database className="w-5 h-5 text-indigo-600" />
          <h2>PostgreSQL Database Architecture</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          All data is structured in relational PostgreSQL tables with indexes on timestamps and status flags for fast querying:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Table Name</th>
                <th className="py-2.5 px-3">Primary Key</th>
                <th className="py-2.5 px-3">Key Attributes</th>
                <th className="py-2.5 px-3">Constraints & Indexes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-2 px-3 font-bold text-slate-800">users</td>
                <td className="py-2 px-3">id (SERIAL)</td>
                <td className="py-2 px-3">full_name, username, email, password_hash</td>
                <td className="py-2 px-3">UNIQUE(username), UNIQUE(email)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-800">telemetry</td>
                <td className="py-2 px-3">id (BIGSERIAL)</td>
                <td className="py-2 px-3">solar_voltage, solar_current, solar_power, battery_soc, etc.</td>
                <td className="py-2 px-3">INDEX(recorded_at DESC), CHECK(power &gt;= 0)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-800">alerts</td>
                <td className="py-2 px-3">id (SERIAL)</td>
                <td className="py-2 px-3">alert_type, severity, message, measured_value, status</td>
                <td className="py-2 px-3">INDEX(status), INDEX(created_at DESC)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-800">system_settings</td>
                <td className="py-2 px-3">id (SERIAL)</td>
                <td className="py-2 px-3">user_id, setting_key, setting_value</td>
                <td className="py-2 px-3">FOREIGN KEY(user_id), UNIQUE(user_id, key)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-800">simulation_state</td>
                <td className="py-2 px-3">id (SERIAL)</td>
                <td className="py-2 px-3">is_running, update_interval_seconds, last_generated_at</td>
                <td className="py-2 px-3">CHECK(interval &gt;= 1)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Future Scope for Hardware Interfacing */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-3">
          <Wifi className="w-5 h-5 text-emerald-600" />
          <h2>Future Scope: Connecting Physical Hardware & IoT Nodes</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          While currently running a pure software telemetry engine, GridGuard’s modular REST API and database layer are designed for seamless physical IoT integration:
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
          <li><strong>Microcontroller Integration:</strong> ESP32 or Raspberry Pi Pico W nodes publishing via MQTT or HTTPS to <code>/api/telemetry</code>.</li>
          <li><strong>Sensors:</strong> INA219 / INA226 high-side DC voltage and current sensors, ACS712 Hall-effect current sensors, DS18B20 digital temperature probes, and calibrated Pyranometers for irradiance.</li>
          <li><strong>Industrial Protocol Gateway:</strong> Modbus RTU / TCP gateway integration with solar hybrid inverters and CAN-bus Battery Management Systems (BMS).</li>
        </ul>
      </div>
    </div>
  );
}
