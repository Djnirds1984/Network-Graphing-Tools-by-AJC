import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, subValue, icon, trend }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</p>
          <h2 className="text-2xl font-bold text-slate-100">{value}</h2>
          {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-slate-800 text-slate-400`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs">
          <span className={`${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>
            {trend === 'up' ? '↑ Increasing' : '↓ Decreasing'}
          </span>
          <span className="text-slate-600 ml-2">vs last hour</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
