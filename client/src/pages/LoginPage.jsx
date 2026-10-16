import React, { useState } from 'react';
import { Sun, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NoticeBanner from '../components/NoticeBanner';
import DbAlertBanner from '../components/DbAlertBanner';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your username or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setIdentifier('admin');
    setPassword('Admin@1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      <NoticeBanner />
      <DbAlertBanner />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-950 p-6 text-white text-center relative">
            <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
              <Sun className="w-8 h-8 animate-[spin_20s_linear_infinite]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Grid<span className="text-emerald-400">Guard</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Solar PV Array & Battery Storage Telemetry
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Access real-time telemetry, battery state, and analytics.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin or engineer@gridguard.energy"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate with PostgreSQL</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials Quick Fill */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-medium transition-colors border border-emerald-200/60"
              >
                Auto-Fill Demo Credentials (admin / Admin@1234)
              </button>
              <p className="text-[11px] text-slate-400 mt-2">
                Credentials verified against PostgreSQL database records
              </p>
            </div>

            {/* Switch to Registration */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Create one now
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-xs text-slate-500">
        GridGuard Telemetry System &copy; {new Date().getFullYear()} — College Full-Stack Project
      </div>
    </div>
  );
}
