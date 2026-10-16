import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import NoticeBanner from '../components/NoticeBanner';
import DbAlertBanner from '../components/DbAlertBanner';

export default function DashboardLayout({
  children,
  currentTab,
  setCurrentTab,
  simRunning,
  onToggleSimulation,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Notice Banner: SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED */}
      <NoticeBanner />

      {/* Database Offline Diagnostics Banner */}
      <DbAlertBanner />

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <TopNavbar
            setMobileOpen={setMobileOpen}
            simRunning={simRunning}
            onToggleSimulation={onToggleSimulation}
          />

          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
            <p>
              GridGuard: Solar PV Array & Battery Storage Telemetry &copy; {new Date().getFullYear()} — College Full-Stack Renewable Energy Project.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Powered by Node.js, Express.js, PostgreSQL, React, and Recharts. Simulated Telemetry Model.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
