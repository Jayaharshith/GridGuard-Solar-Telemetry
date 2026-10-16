import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Sun,
  Activity,
  Battery,
  BatteryCharging,
  Thermometer,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import BatteryGauge from '../components/BatteryGauge';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function DashboardPage({ setCurrentTab }) {
  const [telemetry, setTelemetry] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const isMountedRef = useRef(true);

  // Poll latest telemetry every 3 seconds
  useEffect(() => {
    isMountedRef.current = true;

    async function fetchLatest() {
      try {
        const res = await api.getLatestTelemetry();
        if (isMountedRef.current && res.success && res.telemetry) {
          setTelemetry(res.telemetry);
          setLastRefreshed(new Date());
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    async function fetchRecentHistory() {
      try {
        const histRes = await api.getTelemetryHistory({ range: '1h', limit: 20, sort: 'ASC' });
        if (isMountedRef.current && histRes.success && histRes.data) {
          setHistoryData(
            histRes.data.map((d) => ({
              time: new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              power: d.solar_power,
              soc: d.battery_soc,
              voltage: d.solar_voltage,
            }))
          );
        }
      } catch (_) {}
    }

    fetchLatest();
    fetchRecentHistory();

    const interval = setInterval(fetchLatest, 3000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

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
      {/* Top Welcome & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Solar PV Array & Battery Storage System
            </h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
              <span>LIVE TELEMETRY</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time simulated telemetry ingestion from PostgreSQL • Continuous 3-second cycle
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Connecting...'}</span>
          </div>
          <StatusBadge status={t.system_status} />
        </div>
      </div>

      {/* 8 Mandatory Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Solar Voltage */}
        <MetricCard
          title="Solar Voltage"
          value={t.solar_voltage?.toFixed(2)}
          unit="V"
          icon={Zap}
          accentColor="amber"
          status={t.solar_voltage < 10 ? 'Warning' : 'Normal'}
          subtitle="Nominal PV string range: 15–22 V"
          loading={loading}
        />

        {/* 2. Solar Current */}
        <MetricCard
          title="Solar Current"
          value={t.solar_current?.toFixed(2)}
          unit="A"
          icon={Activity}
          accentColor="yellow"
          status="Normal"
          subtitle="Irradiance driven generation (0–5 A)"
          loading={loading}
        />

        {/* 3. Solar Power */}
        <MetricCard
          title="Solar Power"
          value={t.solar_power?.toFixed(2)}
          unit="W"
          icon={Sun}
          accentColor="orange"
          status="Normal"
          subtitle="Strict physics calculation: P = V × I"
          loading={loading}
        />

        {/* 4. Battery Voltage */}
        <MetricCard
          title="Battery Voltage"
          value={t.battery_voltage?.toFixed(2)}
          unit="V"
          icon={Battery}
          accentColor="blue"
          status={t.battery_voltage < 11.5 ? 'Warning' : 'Normal'}
          subtitle="Nominal 12V bus (10.5–14.6 V)"
          loading={loading}
        />

        {/* 5. Battery State of Charge */}
        <MetricCard
          title="Battery SoC"
          value={t.battery_soc?.toFixed(1)}
          unit="%"
          icon={BatteryCharging}
          accentColor="emerald"
          status={t.battery_soc < 20 ? (t.battery_soc < 10 ? 'Critical' : 'Warning') : 'Normal'}
          subtitle="Estimated usable chemical energy"
          loading={loading}
        />

        {/* 6. Panel Temperature */}
        <MetricCard
          title="Panel Temperature"
          value={t.panel_temperature?.toFixed(1)}
          unit="°C"
          icon={Thermometer}
          accentColor="purple"
          status={t.panel_temperature > 65 ? 'Warning' : 'Normal'}
          subtitle="Ambient + radiant irradiance heating"
          loading={loading}
        />

        {/* 7. Solar Irradiance */}
        <MetricCard
          title="Solar Irradiance"
          value={t.irradiance?.toFixed(1)}
          unit="W/m²"
          icon={Sun}
          accentColor="yellow"
          status={t.irradiance < 50 ? 'Normal' : 'Normal'}
          subtitle="Global horizontal daylight flux"
          loading={loading}
        />

        {/* 8. Overall System Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              System Status
            </span>
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </div>
          <div className="my-2">
            <StatusBadge status={t.system_status} size="lg" />
          </div>
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
            Active alert threshold monitoring
          </p>
        </div>
      </div>

      {/* Middle Section: Battery Subsystem + Power Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Battery Subsystem Overview */}
        <div className="lg:col-span-1">
          <BatteryGauge
            soc={t.battery_soc}
            voltage={t.battery_voltage}
            current={t.battery_current}
            chargingState={
              t.battery_current > 0.1 ? 'Charging' : t.battery_current < -0.1 ? 'Discharging' : 'Idle'
            }
          />
        </div>

        {/* Live Power & SoC Realtime Trends */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Solar Power Trend (Past Hour)</h2>
              <p className="text-xs text-slate-500">Live dynamic curve sampled from PostgreSQL records</p>
            </div>
            <button
              onClick={() => setCurrentTab('analytics')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>Detailed Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="W" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} W`, 'Solar Power']}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#powerGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Awaiting historical telemetry readings from PostgreSQL...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'telemetry', label: 'Live Telemetry', desc: 'Realtime charts & tables' },
          { id: 'battery', label: 'Battery Monitor', desc: 'SoC & Health estimation' },
          { id: 'analytics', label: 'Energy Analytics', desc: 'Wh/kWh energy integrals' },
          { id: 'history', label: 'Telemetry History', desc: 'Search & CSV export' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left group"
          >
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 block">
              {item.label}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">{item.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
