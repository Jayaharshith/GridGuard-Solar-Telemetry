import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BatteryCharging,
  TrendingUp,
  AlertTriangle,
  Database,
  Settings,
  Info,
  LogOut,
  Sun,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();

  const navigationItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
    { id: 'battery', label: 'Battery Storage', icon: BatteryCharging },
    { id: 'analytics', label: 'Energy Analytics', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts & Events', icon: AlertTriangle },
    { id: 'history', label: 'Telemetry History', icon: Database },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'about', label: 'About Project', icon: Info },
  ];

  const handleNavClick = (id) => {
    setCurrentTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sun className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight flex items-center">
                  Grid<span className="text-emerald-400">Guard</span>
                </span>
                <span className="text-[10px] text-slate-400 block tracking-widest font-mono uppercase">
                  PV & Battery Telemetry
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1 mt-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Card and Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-semibold text-xs shrink-0">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || 'Authenticated User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  @{user?.username || 'user'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
