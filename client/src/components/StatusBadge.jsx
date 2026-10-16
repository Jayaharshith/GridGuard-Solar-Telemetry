import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const norm = (status || 'Normal').toLowerCase();

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = CheckCircle2;
  let label = 'Normal';

  if (norm === 'warning') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = AlertTriangle;
    label = 'Warning';
  } else if (norm === 'critical') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = AlertOctagon;
    label = 'Critical';
  } else if (norm === 'active') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = AlertTriangle;
    label = 'Active';
  } else if (norm === 'resolved') {
    colorClasses = 'bg-slate-50 text-slate-600 border-slate-200';
    Icon = CheckCircle2;
    label = 'Resolved';
  } else if (norm === 'info') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
    Icon = Info;
    label = 'Info';
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs md:text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center space-x-1.5 font-medium border rounded-full ${colorClasses} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className="capitalize">{label}</span>
    </span>
  );
}
