import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Play,
  Square,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  ShieldAlert,
  Database,
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import api from '../services/api';

export default function SettingsPage({ simRunning, onToggleSimulation }) {
  const [settings, setSettings] = useState({
    battery_low_voltage_warning: 11.5,
    battery_critical_voltage: 11.0,
    low_soc_warning: 20.0,
    critical_soc: 10.0,
    high_temp_warning: 65.0,
    low_irradiance_warning: 100.0,
    simulation_update_interval: 3,
  });

  const [simStatus, setSimStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
      }
      if (res.simulation) {
        setSimStatus(res.simulation);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchSettings();
    } catch (err) {
      setError(err.message || 'Failed to persist settings in PostgreSQL.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    setError(null);
    try {
      await api.resetDemoData();
      setResetModalOpen(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
      await fetchSettings();
    } catch (err) {
      setError(err.message || 'Failed to reset demo dataset.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">System & Simulation Configuration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure alert thresholds, telemetry tick intervals, and database demo datasets
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings successfully updated and persisted to PostgreSQL!</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Demo telemetry and alerts baseline successfully regenerated in PostgreSQL!</span>
        </div>
      )}

      {/* Simulator Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2.5 rounded-lg ${simRunning ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Radio className={`w-5 h-5 ${simRunning ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Telemetry Engine Runtime</h2>
              <p className="text-xs text-slate-500">
                Physics-based solar PV diurnal cycle and battery charge simulation service
              </p>
              <div className="mt-2 flex items-center space-x-2 text-xs">
                <span className="text-slate-500">Status:</span>
                <span className={`font-semibold ${simRunning ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {simRunning ? 'RUNNING (Generating & Saving Readings)' : 'STOPPED / PAUSED'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  Update Interval: <strong>{settings.simulation_update_interval}s</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleSimulation}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-xs ${
              simRunning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {simRunning ? (
              <>
                <Square className="w-4 h-4" />
                <span>Pause Simulator</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Simulator</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Threshold Configuration Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Alert Threshold Configurations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Battery Low Voltage Warning */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Battery Low-Voltage Warning (V)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.battery_low_voltage_warning}
              onChange={(e) => handleChange('battery_low_voltage_warning', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 11.5 V. Triggers supervisory battery warning.
            </span>
          </div>

          {/* Battery Critical Voltage */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Battery Critical Voltage (V)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.battery_critical_voltage}
              onChange={(e) => handleChange('battery_critical_voltage', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 11.0 V. Triggers critical deep discharge alert.
            </span>
          </div>

          {/* Low SoC Warning */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Low State of Charge Warning (%)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              value={settings.low_soc_warning}
              onChange={(e) => handleChange('low_soc_warning', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 20%. Warns operator of depleted reserve capacity.
            </span>
          </div>

          {/* Critical SoC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Critical State of Charge (%)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              value={settings.critical_soc}
              onChange={(e) => handleChange('critical_soc', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 10%. Critical load shedding recommendation.
            </span>
          </div>

          {/* High Panel Temp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              High PV Panel Temperature (°C)
            </label>
            <input
              type="number"
              step="1"
              value={settings.high_temp_warning}
              onChange={(e) => handleChange('high_temp_warning', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 65°C. Detects thermal derating condition.
            </span>
          </div>

          {/* Telemetry Update Interval */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Simulator Tick Interval (Seconds)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="60"
              value={settings.simulation_update_interval}
              onChange={(e) => handleChange('simulation_update_interval', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default: 3 seconds. Period between telemetry record insertions in PostgreSQL.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving to PostgreSQL...' : 'Save Settings to PostgreSQL'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Reset Demo Dataset */}
      <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-rose-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Reset Demonstration Dataset</span>
            </h2>
            <p className="text-xs text-rose-700 mt-1 max-w-xl">
              Clears the telemetry and alert records in PostgreSQL and seeds a fresh 24-hour baseline curve.
              Requires explicit confirmation dialog.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-center"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      <ConfirmationModal
        isOpen={resetModalOpen}
        title="Confirm Demo Dataset Reset"
        message="Are you sure you want to reset the demonstration telemetry records? This will clear existing simulated records in PostgreSQL and generate a fresh 24-hour diurnal profile."
        confirmText="Yes, Reset Telemetry"
        cancelText="Cancel"
        danger={true}
        loading={resetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}
