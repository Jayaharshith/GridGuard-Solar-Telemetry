import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import LiveTelemetryPage from './pages/LiveTelemetryPage';
import BatteryPage from './pages/BatteryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import api from './services/api';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [simRunning, setSimRunning] = useState(true);

  // Check simulation status periodically
  useEffect(() => {
    async function checkSim() {
      try {
        const res = await api.getSimulationStatus();
        if (res.success && res.isRunning !== undefined) {
          setSimRunning(res.isRunning);
        }
      } catch (_) {}
    }
    checkSim();
    const interval = setInterval(checkSim, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSimulation = async () => {
    try {
      if (simRunning) {
        await api.stopSimulation();
        setSimRunning(false);
      } else {
        await api.startSimulation();
        setSimRunning(true);
      }
    } catch (err) {
      alert('Failed to toggle simulator: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-tight">GridGuard Telemetry System</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to PostgreSQL and verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToRegister={() => setAuthView('register')} />;
  }

  return (
    <DashboardLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      simRunning={simRunning}
      onToggleSimulation={handleToggleSimulation}
    >
      {currentTab === 'dashboard' && <DashboardPage setCurrentTab={setCurrentTab} />}
      {currentTab === 'telemetry' && <LiveTelemetryPage />}
      {currentTab === 'battery' && <BatteryPage />}
      {currentTab === 'analytics' && <AnalyticsPage />}
      {currentTab === 'alerts' && <AlertsPage />}
      {currentTab === 'history' && <HistoryPage />}
      {currentTab === 'settings' && (
        <SettingsPage simRunning={simRunning} onToggleSimulation={handleToggleSimulation} />
      )}
      {currentTab === 'about' && <AboutPage />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
