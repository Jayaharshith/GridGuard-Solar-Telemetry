import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Filter,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      const res = await api.getAlerts(params);
      if (res.success && res.alerts) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter]);

  const handleResolve = async (id) => {
    try {
      setResolvingId(id);
      await api.resolveAlert(id);
      await fetchAlerts();
    } catch (err) {
      console.error('Error resolving alert:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Alerts & Notifications</h1>
            {activeCount > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {activeCount} Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Threshold violations and supervisory events recorded in PostgreSQL
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Software Warning Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">Important Engineering Notice:</span>
          <span>
            These alerts represent <strong>software supervisory warnings</strong> evaluated against mathematical telemetry models.
            They are not hardware breaker or BMS physical trip circuits.
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Active Warnings</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
              {activeCount}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Critical Alerts</span>
            <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
              {criticalCount}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Recorded</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
              {alerts.length}
            </span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filter Records:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isActive = alert.status === 'active';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? isCritical
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      isCritical
                        ? 'bg-rose-100 text-rose-600'
                        : alert.severity === 'warning'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-sky-100 text-sky-600'
                    }`}
                  >
                    {isCritical ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">
                        {alert.alert_type}
                      </span>
                      <StatusBadge status={alert.severity} size="sm" />
                      <StatusBadge status={alert.status} size="sm" />
                    </div>

                    <p className="text-xs text-slate-600 mt-1 max-w-2xl">{alert.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono">
                      <span>Measured: <strong>{alert.measured_value}</strong></span>
                      <span>Threshold: <strong>{alert.threshold_value}</strong></span>
                      <span>Triggered: {new Date(alert.created_at).toLocaleString()}</span>
                      {alert.resolved_at && (
                        <span className="text-emerald-600 font-semibold">
                          Resolved: {new Date(alert.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="self-end md:self-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 transition-colors flex items-center space-x-1 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No alert records match the selected filter. System operating smoothly.
          </div>
        )}
      </div>
    </div>
  );
}
