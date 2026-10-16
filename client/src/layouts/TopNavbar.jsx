import React, { useState, useEffect } from 'react';
import { Menu, Database, Radio, Clock, ShieldCheck, Play, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function TopNavbar({ setMobileOpen, simRunning = true, onToggleSimulation }) {
  const { user, dbStatus, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime.toLocaleDateString()}</span>
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Right: Status Indicators & Profile */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* PostgreSQL Status Indicator */}
        <div
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
            dbStatus.connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
          title={dbStatus.connected ? 'PostgreSQL Active & Persistent' : dbStatus.error || 'PostgreSQL Disconnected'}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {dbStatus.connected ? 'PostgreSQL 5432' : 'PostgreSQL Offline'}
          </span>
          <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        </div>

        {/* Simulator Service Indicator */}
        <div
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border font-medium cursor-pointer ${
            simRunning
              ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          onClick={onToggleSimulation}
          title="Click to toggle telemetry simulator"
        >
          <Radio className={`w-3.5 h-3.5 ${simRunning ? 'text-sky-600 animate-pulse' : 'text-amber-600'}`} />
          <span className="hidden sm:inline">Sim: {simRunning ? 'Active (3s)' : 'Paused'}</span>
          <span className="sm:hidden">{simRunning ? 'Sim On' : 'Sim Off'}</span>
        </div>

        {/* User Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <button
            onClick={logout}
            className="hidden md:inline text-xs text-slate-500 hover:text-rose-600 font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
