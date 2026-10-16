import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  Battery,
  BatteryLow,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
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
import BatteryGauge from '../components/BatteryGauge';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function BatteryPage() {
  const [batteryStatus, setBatteryStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  const fetchBatteryData = async () => {
    try {
      const [statusRes, histRes] = await Promise.all([
        api.getBatteryStatus(),
        api.getBatteryHistory(range),
      ]);

      if (statusRes.success && statusRes.battery) {
        setBatteryStatus(statusRes.battery);
      }
      if (histRes.success && histRes.data) {
        setHistory(
          histRes.data.map((d) => ({
            time: new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            voltage: d.battery_voltage,
            soc: d.battery_soc,
            current: d.battery_current,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching battery data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatteryData();
    const interval = setInterval(fetchBatteryData, 3000);
    return () => clearInterval(interval);
  }, [range]);

  const b = batteryStatus || {
    voltage: 12.6,
    current: 0,
    powerWatts: 0,
    socPercentage: 75,
    chargingState: 'Idle',
    warningLevel: 'Normal',
    warningMessage: 'Battery operating within nominal limits.',
    ratedCapacityAh: 100,
    nominalVoltage: 12.0,
    chemistry: 'Simulated LiFePO4 / Lead-Acid',
    healthState: 'Simulated 98% SOH (Good)',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Battery Storage Subsystem</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulated 12V 100Ah Storage Bank Telemetry & Coulomb Counting Estimation
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          {['15m', '1h', '24h', '7d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                range === r ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Warning Notice if warningLevel !== 'Normal' */}
      {b.warningLevel !== 'Normal' && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          b.warningLevel === 'Critical' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">Battery Alert: {b.warningLevel} Condition Detected</span>
            <span className="text-xs">{b.warningMessage}</span>
          </div>
        </div>
      )}

      {/* Main Battery Layout: Gauge + Key Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BatteryGauge
            soc={b.socPercentage}
            voltage={b.voltage}
            current={b.current}
            chargingState={b.chargingState}
            health={b.healthState}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="Battery Terminal Voltage"
            value={b.voltage?.toFixed(2)}
            unit="V"
            icon={Battery}
            accentColor="blue"
            status={b.voltage < 11.5 ? 'Warning' : 'Normal'}
            subtitle="Safe Operating Limit: 11.0V – 14.6V"
          />

          <MetricCard
            title="Charge / Discharge Current"
            value={b.current > 0 ? `+${b.current?.toFixed(2)}` : b.current?.toFixed(2)}
            unit="A"
            icon={Activity}
            accentColor={b.current >= 0 ? 'emerald' : 'orange'}
            status="Normal"
            subtitle={b.current > 0 ? 'Net charging from PV generation' : 'Net discharge supplying system load'}
          />

          <MetricCard
            title="Instantaneous Battery Power"
            value={b.powerWatts?.toFixed(1)}
            unit="W"
            icon={Zap}
            accentColor="amber"
            status="Normal"
            subtitle="P_batt = V_batt × I_batt"
          />

          <MetricCard
            title="State of Health (SOH)"
            value="98.0"
            unit="%"
            icon={ShieldCheck}
            accentColor="emerald"
            status="Normal"
            subtitle="Simulated degradation estimate"
          />
        </div>
      </div>

      {/* History Charts: Dual Voltage and SoC Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SoC History Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800">State of Charge (SoC) Curve</h2>
            <p className="text-xs text-slate-500">Historical battery reserve percentage over selected range ({range})</p>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Battery SoC']}
                  />
                  <Area type="monotone" dataKey="soc" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#socGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Awaiting historical records from PostgreSQL...
              </div>
            )}
          </div>
        </div>

        {/* Battery Voltage Trend Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800">Terminal Voltage Trend</h2>
            <p className="text-xs text-slate-500">Bus voltage dynamic variation under load and charge ({range})</p>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[10, 15]} unit="V" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} V`, 'Battery Voltage']}
                  />
                  <Line type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Awaiting historical records from PostgreSQL...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battery Mathematical Model Documentation Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>Battery Storage Estimation Model (Mathematical Documentation)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The simulated battery storage system represents a <strong>12V, 100Ah (1,200 Wh nominal capacity)</strong> energy storage bank.
          State of Charge (SoC) is simulated through <em>Coulomb Counting</em> numerical integration:
        </p>
        <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
          ΔSoC (%) = ( I_batt × Δt / Capacity_Ah ) × 100%<br />
          V_terminal = V_oc(SoC) + ( I_batt × R_internal )
        </div>
        <p className="text-[11px] text-slate-500 italic">
          * Note: This simulation is an educational software approximation and is not a laboratory electrochemical measurement. All readings are marked as SIMULATED DATA.
        </p>
      </div>
    </div>
  );
}
