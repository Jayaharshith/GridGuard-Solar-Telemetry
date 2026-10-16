import React, { useState } from 'react';
import { Database, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DbAlertBanner() {
  const { dbStatus, checkHealth } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dbStatus.connected) {
    return null;
  }

  const handleRetry = async () => {
    setRetrying(true);
    await checkHealth();
    setTimeout(() => setRetrying(false), 500);
  };

  return (
    <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-sm text-rose-900 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-rose-100 rounded-md text-rose-600 mt-0.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <div className="font-semibold text-rose-950 flex items-center space-x-2">
              <span>PostgreSQL Database Connection Offline</span>
              <span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                5432
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              The backend Express server is running, but cannot reach PostgreSQL at <code className="bg-rose-100 px-1 py-0.2 rounded font-mono">localhost:5432</code>.
              Database persistence for telemetry and authentication requires an active PostgreSQL instance.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-rose-700 hover:text-rose-900 flex items-center space-x-1 px-2.5 py-1.5 rounded-md hover:bg-rose-100 transition-colors"
          >
            <span>{expanded ? 'Hide Guide' : 'Setup Guide'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center space-x-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-md transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-rose-200 text-xs text-rose-800 space-y-2">
          <p className="font-medium">To connect PostgreSQL locally:</p>
          <ol className="list-decimal list-inside space-y-1 font-mono bg-rose-100/60 p-2.5 rounded-md text-rose-900">
            <li>Ensure PostgreSQL service is started on port 5432</li>
            <li>Configure credentials in <code className="bg-rose-200/70 px-1 py-0.5 rounded">server/.env</code> (DB_USER, DB_PASSWORD, DB_NAME)</li>
            <li>Run schema initialization: <code className="bg-rose-200/70 px-1 py-0.5 rounded">npm run db:init</code> inside <code className="bg-rose-200/70 px-1 py-0.5 rounded">server/</code></li>
            <li>Seed initial demonstration data: <code className="bg-rose-200/70 px-1 py-0.5 rounded">npm run db:seed</code></li>
          </ol>
          {dbStatus.error && (
            <p className="text-[11px] text-rose-600 font-mono">
              Raw Connection Diagnostic: {dbStatus.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
