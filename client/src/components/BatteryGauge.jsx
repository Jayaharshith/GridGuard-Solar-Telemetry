import React from 'react';
import { BatteryCharging, BatteryLow, Battery, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function BatteryGauge({
  soc = 0,
  voltage = 0,
  current = 0,
  chargingState = 'Idle',
  health = 'Simulated 98% SOH',
}) {
  const socNum = Math.max(0, Math.min(100, parseFloat(soc) || 0));

  // Determine color by SoC
  let strokeColor = '#10b981'; // emerald-500
  let bgColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let BatteryIcon = BatteryCharging;

  if (socNum < 15) {
    strokeColor = '#f43f5e'; // rose-500
    bgColor = 'bg-rose-50 text-rose-700 border-rose-200';
    BatteryIcon = BatteryLow;
  } else if (socNum < 30) {
    strokeColor = '#f59e0b'; // amber-500
    bgColor = 'bg-amber-50 text-amber-700 border-amber-200';
    BatteryIcon = Battery;
  }

  // Circular gauge calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (socNum / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-between">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Battery Storage Subsystem</h3>
          <p className="text-xs text-slate-500">12V 100Ah Deep-Cycle Bank</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center space-x-1 ${bgColor}`}>
          {chargingState === 'Charging' && <ArrowUpRight className="w-3.5 h-3.5" />}
          {chargingState === 'Discharging' && <ArrowDownRight className="w-3.5 h-3.5" />}
          {chargingState === 'Idle' && <Minus className="w-3.5 h-3.5" />}
          <span>{chargingState}</span>
        </span>
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative flex items-center justify-center my-2">
        <svg className="w-44 h-44 transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="14"
            fill="transparent"
          />
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke={strokeColor}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <Zap className="w-5 h-5 text-amber-500 mb-0.5 animate-pulse" />
          <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {socNum.toFixed(1)}%
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            State of Charge
          </span>
        </div>
      </div>

      {/* Linear SoC Progress Bar */}
      <div className="w-full mt-4">
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>0% Depleted</span>
          <span>50%</span>
          <span>100% Full</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${socNum}%`, backgroundColor: strokeColor }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="w-full grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-[11px] text-slate-500 block">Voltage</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{voltage.toFixed(2)} V</span>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-[11px] text-slate-500 block">Current</span>
          <span className="text-sm font-bold text-slate-800 font-mono">
            {current > 0 ? `+${current.toFixed(2)}` : current.toFixed(2)} A
          </span>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-[11px] text-slate-500 block">Health</span>
          <span className="text-xs font-semibold text-emerald-600 block mt-0.5">Good (Sim)</span>
        </div>
      </div>
    </div>
  );
}
