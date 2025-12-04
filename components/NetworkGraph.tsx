import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrafficPoint } from '../types';

interface NetworkGraphProps {
  data: TrafficPoint[];
  title: string;
  height?: number;
  colorTx?: string;
  colorRx?: string;
  className?: string;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  data, 
  title, 
  height = 200, 
  colorTx = "#06b6d4", // cyan-500
  colorRx = "#8b5cf6", // violet-500
  className
}) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h3>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorTx }}></span>
            <span className="text-slate-400">TX</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorRx }}></span>
            <span className="text-slate-400">RX</span>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: height }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradientTx-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorTx} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colorTx} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id={`gradientRx-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorRx} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colorRx} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fill: '#64748b', fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}M`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="tx" 
              stroke={colorTx} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#gradientTx-${title})`} 
              isAnimationActive={true}
              animationDuration={400}
            />
            <Area 
              type="monotone" 
              dataKey="rx" 
              stroke={colorRx} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#gradientRx-${title})`}
              isAnimationActive={true}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetworkGraph;
