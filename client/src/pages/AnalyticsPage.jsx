import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sun,
  Zap,
  Activity,
  Thermometer,
  Calendar,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

export default function AnalyticsPage() {
  const [range, setRange] = useState('24h');
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [statsRes, historyRes] = await Promise.all([
        api.getTelemetryStats(range),
        api.getTelemetryHistory({ range, limit: 60, sort: 'ASC' }),
      ]);

      if (statsRes.success) {
        setStats(statsRes);
      }
      if (historyRes.success && historyRes.data) {
        setHistory(
          historyRes.data.map((d) => ({
            time: new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            solar_power: d.solar_power,
            irradiance: d.irradiance,
            solar_voltage: d.solar_voltage,
            solar_current: d.solar_current,
            battery_soc: d.battery_soc,
            panel_temp: d.panel_temperature,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const s = stats || {
    energy: { wattHours: 0, kiloWattHours: 0, formatted: '0.0 Wh' },
    solar: { avgPowerWatts: 0, maxPowerWatts: 0, avgIrradiance: 0, avgTemperature: 0 },
    battery: { avgSoc: 0, minSoc: 0, maxSoc: 0 },
    totalReadings: 0,
    hasEnoughData: false,
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Time Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Energy & Power Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Trapezoidal Numerical Integration of Power & Multi-parameter Statistics
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          {[
            { id: '15m', label: '15 Minutes' },
            { id: '1h', label: '1 Hour' },
            { id: '24h', label: '24 Hours' },
            { id: '7d', label: '7 Days' },
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

      {/* Energy Hero Banner (Cumulative Energy vs Instantaneous Power) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center space-x-1.5">
              <Zap className="w-4 h-4" />
              <span>Accumulated Energy Yield ({range.toUpperCase()})</span>
            </span>
            <div className="mt-2 flex items-baseline space-x-3">
              <span className="text-4xl md:text-5xl font-extrabold font-mono tracking-tight text-white">
                {s.energy?.formatted || '0.0 Wh'}
              </span>
              <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full">
                {s.totalReadings} PostgreSQL Samples
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Calculated via time-based <em>Trapezoidal Numerical Approximation</em>: ∫ P(t) dt.
              Instantaneous power (Watts) represents current rate; accumulated energy (Watt-hours) measures total electrical work performed over time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center shrink-0">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block">Peak Generation</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {s.solar?.maxPowerWatts?.toFixed(1)} W
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block">Average Power</span>
              <span className="text-lg font-bold font-mono text-white">
                {s.solar?.avgPowerWatts?.toFixed(1)} W
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient data warning if < 2 points */}
      {!s.hasEnoughData && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Not enough historical telemetry records in PostgreSQL to compute numerical energy integration for this time window.
            Allow the simulator to run for a few minutes or seed the database with demo records.
          </span>
        </div>
      )}

      {/* Analytical Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Average Solar Power"
          value={s.solar?.avgPowerWatts?.toFixed(1)}
          unit="W"
          icon={Sun}
          accentColor="amber"
          subtitle={`Window: ${range}`}
        />
        <MetricCard
          title="Maximum Solar Power"
          value={s.solar?.maxPowerWatts?.toFixed(1)}
          unit="W"
          icon={TrendingUp}
          accentColor="emerald"
          subtitle="Peak instantaneous rate"
        />
        <MetricCard
          title="Average Irradiance"
          value={s.solar?.avgIrradiance?.toFixed(1)}
          unit="W/m²"
          icon={Sun}
          accentColor="yellow"
          subtitle="Mean daylight flux"
        />
        <MetricCard
          title="Average PV Cell Temp"
          value={s.solar?.avgTemperature?.toFixed(1)}
          unit="°C"
          icon={Thermometer}
          accentColor="purple"
          subtitle="Operating surface temp"
        />
      </div>

      {/* Solar Power Generation History Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Solar Power Generation Profile (P = V × I)</h2>
            <p className="text-xs text-slate-500">Historical curve integrated for energy yield estimation</p>
          </div>
          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
            Unit: Watts (W)
          </span>
        </div>

        <div className="h-72 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="W" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`${val} W`, 'Solar Power']}
                />
                <Area type="monotone" dataKey="solar_power" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsPower)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical data available for selected period.
            </div>
          )}
        </div>
      </div>

      {/* Dual Voltage & Current Curves */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-800">Voltage & Current Historical Correlation</h2>
          <p className="text-xs text-slate-500">Correlation between PV output voltage (V) and generation current (A)</p>
        </div>

        <div className="h-72 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="v" stroke="#3b82f6" fontSize={11} tickLine={false} unit="V" />
                <YAxis yAxisId="i" orientation="right" stroke="#f59e0b" fontSize={11} tickLine={false} unit="A" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line yAxisId="v" type="monotone" dataKey="solar_voltage" name="Solar Voltage (V)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="i" type="monotone" dataKey="solar_current" name="Solar Current (A)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical data available for selected period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
