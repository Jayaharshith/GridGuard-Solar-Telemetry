import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function NoticeBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs md:text-sm text-amber-800 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="font-semibold tracking-wide">SYSTEM NOTICE:</span>
        <span>SIMULATED DATA — NO PHYSICAL HARDWARE CONNECTED</span>
      </div>
      <div className="hidden md:flex items-center space-x-1.5 text-xs text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
        <span>Virtual Telemetry Emulation Active</span>
      </div>
    </div>
  );
}
