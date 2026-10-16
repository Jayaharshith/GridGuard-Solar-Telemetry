import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Sun,
  Activity,
  Battery,
  BatteryCharging,
  Thermometer,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function LiveTelemetryPage() {
  const [range, setRange] = useState('1h');
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('power_irr'); // 'power_irr', 'voltages', 'currents'
  const isMountedRef = useRef(true);

  const fetchTelemetry = async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        api.getLatestTelemetry(),
        api.getTelemetryHistory({ range, limit: 40, sort: 'ASC' }),
      ]);

      if (isMountedRef.current) {
        if (latestRes.success && latestRes.telemetry) {
          setTelemetry(latestRes.telemetry);
        }
        if (historyRes.success && historyRes.data) {
          setHistory(
            historyRes.data.map((d) => ({
              id: d.id,
              time: new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              recorded_at: d.recorded_at,
              solar_power: d.solar_power,
              irradiance: d.irradiance,
              solar_voltage: d.solar_voltage,
              battery_voltage: d.battery_voltage,
              solar_current: d.solar_current,
              battery_current: d.battery_current,
              battery_soc: d.battery_soc,
              panel_temperature: d.panel_temperature,
              system_status: d.system_status,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching live telemetry:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [range]);

  const t = telemetry || {
    solar_voltage: 0,
    solar_current: 0,
    solar_power: 0,
    battery_voltage: 0,
    battery_current: 0,
    battery_soc: 0,
    panel_temperature: 0,
    irradiance: 0,
    system_status: 'Normal',
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Live Telemetry Feeds</h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-channel sensor telemetry streaming from PostgreSQL database
          </p>
        </div>

        {/* Range Selector Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          {[
            { id: '15m', label: 'Last 15m' },
            { id: '1h', label: 'Last 1h' },
            { id: '24h', label: 'Last 24h' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                range === r.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Solar PV Power"
          value={t.solar_power?.toFixed(2)}
          unit="W"
          icon={Sun}
          accentColor="amber"
          subtitle={`P = ${t.solar_voltage?.toFixed(1)}V × ${t.solar_current?.toFixed(1)}A`}
          loading={loading}
        />
        <MetricCard
          title="Solar Irradiance"
          value={t.irradiance?.toFixed(1)}
          unit="W/m²"
          icon={Sun}
          accentColor="yellow"
          subtitle="Direct Solar Flux"
          loading={loading}
        />
        <MetricCard
          title="Battery SoC"
          value={t.battery_soc?.toFixed(1)}
          unit="%"
          icon={BatteryCharging}
          accentColor="emerald"
          subtitle={`${t.battery_voltage?.toFixed(2)} V Bus`}
          loading={loading}
        />
        <MetricCard
          title="Cell Temperature"
          value={t.panel_temperature?.toFixed(1)}
          unit="°C"
          icon={Thermometer}
          accentColor="purple"
          subtitle="PV Surface Temp"
          loading={loading}
        />
      </div>

      {/* Main Multi-Series Live Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Telemetry Time-Series Charts</h2>
            <p className="text-xs text-slate-500">Select parameter pairs to visualize electrical and physical relationships</p>
          </div>

          <div className="flex items-center space-x-2">
            {[
              { id: 'power_irr', label: 'Power & Irradiance' },
              { id: 'voltages', label: 'Solar & Battery Volts' },
              { id: 'currents', label: 'PV & Battery Amps' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeChart === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {activeChart === 'power_irr' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="solar_power"
                      name="Solar Power (W)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="irradiance"
                      name="Irradiance (W/m²)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                )}

                {activeChart === 'voltages' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="solar_voltage"
                      name="Solar Voltage (V)"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="battery_voltage"
                      name="Battery Voltage (V)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                )}

                {activeChart === 'currents' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="solar_current"
                      name="Solar Current (A)"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="battery_current"
                      name="Battery Current (A)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical data available for selected period.
            </div>
          )}
        </div>
      </div>

      {/* Recent Telemetry Stream Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Telemetry Readings (Live Stream)</h3>
            <p className="text-xs text-slate-500">Last 10 records recorded in PostgreSQL</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">
            Table Source: telemetry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Solar V</th>
                <th className="py-3 px-4">Solar I</th>
                <th className="py-3 px-4">Solar Power</th>
                <th className="py-3 px-4">Batt V</th>
                <th className="py-3 px-4">Batt I</th>
                <th className="py-3 px-4">Batt SoC</th>
                <th className="py-3 px-4">Temp</th>
                <th className="py-3 px-4">Irradiance</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.slice(-10).reverse().map((row) => (
                <tr key={row.id || row.recorded_at} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-600">{row.time}</td>
                  <td className="py-2.5 px-4 font-mono font-medium">{row.solar_voltage?.toFixed(2)} V</td>
                  <td className="py-2.5 px-4 font-mono font-medium">{row.solar_current?.toFixed(2)} A</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">{row.solar_power?.toFixed(2)} W</td>
                  <td className="py-2.5 px-4 font-mono font-medium">{row.battery_voltage?.toFixed(2)} V</td>
                  <td className="py-2.5 px-4 font-mono font-medium">{row.battery_current?.toFixed(2)} A</td>
                  <td className="py-2.5 px-4 font-mono font-bold">{row.battery_soc?.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 font-mono">{row.panel_temperature?.toFixed(1)} °C</td>
                  <td className="py-2.5 px-4 font-mono">{row.irradiance?.toFixed(1)} W/m²</td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={row.system_status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
