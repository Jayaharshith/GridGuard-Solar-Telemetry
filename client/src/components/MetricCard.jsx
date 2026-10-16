import React from 'react';

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  status = 'Normal',
  subtitle,
  accentColor = 'blue',
  loading = false,
}) {
  const normStatus = (status || 'Normal').toLowerCase();

  let statusDotColor = 'bg-emerald-500';
  let cardBorderColor = 'border-slate-200';

  if (normStatus === 'warning') {
    statusDotColor = 'bg-amber-500';
    cardBorderColor = 'border-amber-300';
  } else if (normStatus === 'critical') {
    statusDotColor = 'bg-rose-500';
    cardBorderColor = 'border-rose-300';
  }

  // Accent icon background map
  const colorMap = {
    amber: 'bg-amber-50 text-amber-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const iconStyle = colorMap[accentColor] || colorMap.blue;

  return (
    <div className={`bg-white rounded-xl border ${cardBorderColor} p-4 md:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`p-2.5 rounded-lg ${iconStyle}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              {title}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5" title={`Status: ${status}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor} animate-pulse`} />
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded" />
        ) : (
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              {value !== undefined && value !== null ? value : '--'}
            </span>
            {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
          </div>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
          <span>{subtitle}</span>
          <span className="capitalize text-[11px] font-medium text-slate-600">{status}</span>
        </div>
      )}
    </div>
  );
}
