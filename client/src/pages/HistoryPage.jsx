import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function HistoryPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [range, setRange] = useState('24h');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getTelemetryHistory({
        range,
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit,
        sort: sortOrder,
      });

      if (res.success) {
        setData(res.data);
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Error fetching telemetry history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, pagination.limit, range, statusFilter, sortOrder]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await api.exportCsv(range, statusFilter);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Historical Telemetry Log</h1>
          <p className="text-xs text-slate-500 mt-1">
            Searchable, paginated audit records stored in PostgreSQL database
          </p>
        </div>

        {/* Export CSV button */}
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 self-start sm:self-center"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating CSV...' : 'Export Filtered CSV'}</span>
        </button>
      </div>

      {/* Control and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-semibold">Time Window:</span>
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-800"
            >
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All Available Records</option>
            </select>
          </div>

          {/* System Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-semibold">System Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Normal">Normal</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={toggleSort}
            className="flex items-center space-x-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            title="Toggle timestamp sorting direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort: {sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        {/* Total Count Badge */}
        <div className="text-xs text-slate-500 font-mono">
          Showing <strong>{data.length}</strong> of <strong>{pagination.total}</strong> records
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC / Local)</th>
                <th className="py-3 px-4">Solar V</th>
                <th className="py-3 px-4">Solar I</th>
                <th className="py-3 px-4">Solar Power (P)</th>
                <th className="py-3 px-4">Battery V</th>
                <th className="py-3 px-4">Battery I</th>
                <th className="py-3 px-4">Battery SoC</th>
                <th className="py-3 px-4">Panel Temp</th>
                <th className="py-3 px-4">Irradiance</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Querying PostgreSQL database...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(row.recorded_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{row.solar_voltage?.toFixed(2)} V</td>
                    <td className="py-3 px-4 font-mono font-medium">{row.solar_current?.toFixed(2)} A</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">{row.solar_power?.toFixed(2)} W</td>
                    <td className="py-3 px-4 font-mono font-medium">{row.battery_voltage?.toFixed(2)} V</td>
                    <td className="py-3 px-4 font-mono font-medium">{row.battery_current?.toFixed(2)} A</td>
                    <td className="py-3 px-4 font-mono font-bold">{row.battery_soc?.toFixed(1)}%</td>
                    <td className="py-3 px-4 font-mono">{row.panel_temperature?.toFixed(1)} °C</td>
                    <td className="py-3 px-4 font-mono">{row.irradiance?.toFixed(1)} W/m²</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.system_status} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-400">
                    No telemetry records found for this filter criteria in PostgreSQL.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination((p) => ({ ...p, limit: parseInt(e.target.value, 10), page: 1 }));
              }}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-xs"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong>
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1 || loading}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
