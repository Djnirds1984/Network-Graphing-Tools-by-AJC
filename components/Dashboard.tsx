import React, { useState, useMemo } from 'react';
import { NetworkInterface, PPPoEClient, SystemStats, TrafficPoint } from '../types';
import StatsCard from './StatsCard';
import NetworkGraph from './NetworkGraph';
import { analyzeNetworkHealth } from '../services/geminiService';

interface DashboardProps {
  interfaces: NetworkInterface[];
  clients: PPPoEClient[];
  sysStats: SystemStats;
}

const Dashboard: React.FC<DashboardProps> = ({ interfaces, clients, sysStats }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Calculate current totals
  const totalTx = interfaces.reduce((acc, curr) => acc + curr.currentTx, 0);
  const totalRx = interfaces.reduce((acc, curr) => acc + curr.currentRx, 0);
  const activeClients = clients.filter(c => c.currentTx > 0.1 || c.currentRx > 0.1).length;

  // Calculate Aggregate History for the Graph
  const aggregateHistory = useMemo(() => {
    if (interfaces.length === 0) return [];
    
    // Assume all interfaces have synced history length (handled by mock service)
    const historyLength = interfaces[0].history.length;
    const agg: TrafficPoint[] = [];

    for (let i = 0; i < historyLength; i++) {
      let sumTx = 0;
      let sumRx = 0;
      let timestamp = interfaces[0].history[i]?.timestamp || '';

      interfaces.forEach(iface => {
        const point = iface.history[i];
        if (point) {
          sumTx += point.tx;
          sumRx += point.rx;
        }
      });

      agg.push({
        timestamp,
        tx: parseFloat(sumTx.toFixed(2)),
        rx: parseFloat(sumRx.toFixed(2))
      });
    }
    return agg;
  }, [interfaces]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeNetworkHealth(interfaces, clients, sysStats);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header with AI Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
          <p className="text-slate-400 text-sm">System overview and aggregate network performance.</p>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={analyzing}
          className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            analyzing 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-purple-900/20'
          }`}
        >
          {analyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Insight
            </>
          )}
        </button>
      </div>

      {/* AI Analysis Result */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-indigo-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-32 h-32 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <h3 className="text-indigo-400 font-bold mb-2 flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
            Gemini Analysis
          </h3>
          <p className="text-slate-300 leading-relaxed relative z-10 whitespace-pre-line text-sm">{aiAnalysis}</p>
        </div>
      )}

      {/* Row 1: System Info & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Router Information Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                    Router Information
                </h3>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-500 text-sm">Board Name</span>
                    <span className="text-slate-200 font-medium font-mono text-sm">{sysStats.boardName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-500 text-sm">RouterOS</span>
                    <span className="text-slate-200 font-medium font-mono text-sm">{sysStats.version}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Uptime</span>
                    <span className="text-emerald-400 font-medium font-mono text-sm">{sysStats.uptime}</span>
                </div>
            </div>
        </div>

        {/* System Resources Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
             <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                    System Resources
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CPU Gauge */}
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">CPU Load</span>
                        <span className={`text-sm font-bold ${sysStats.cpuLoad > 80 ? 'text-red-400' : 'text-cyan-400'}`}>{sysStats.cpuLoad}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${sysStats.cpuLoad > 80 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                            style={{ width: `${sysStats.cpuLoad}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">14 Cores Active</p>
                </div>

                {/* Memory Gauge */}
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">Memory Usage</span>
                        <span className={`text-sm font-bold ${sysStats.memoryUsage > 80 ? 'text-amber-400' : 'text-purple-400'}`}>{sysStats.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${sysStats.memoryUsage > 80 ? 'bg-amber-500' : 'bg-purple-500'}`} 
                            style={{ width: `${sysStats.memoryUsage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">3.2 GB / 4.0 GB</p>
                </div>
            </div>
        </div>
      </div>

      {/* Row 2: Aggregate Traffic Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm">
          <div className="p-4 pb-0">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Total Network Traffic</h3>
             <p className="text-xs text-slate-500">Aggregate of all {interfaces.length} interfaces</p>
          </div>
          <NetworkGraph 
              data={aggregateHistory} 
              title="Aggregate Throughput" 
              height={250}
              className="!bg-transparent !border-0 !shadow-none"
              colorTx="#f59e0b" // Amber for Total TX
              colorRx="#10b981" // Emerald for Total RX
          />
      </div>

      {/* Row 3: Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard 
          label="Total Download" 
          value={`${totalRx.toFixed(1)} Mbps`} 
          subValue="Current Rate"
          icon={<svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
        />
        <StatsCard 
          label="Total Upload" 
          value={`${totalTx.toFixed(1)} Mbps`} 
          subValue="Current Rate"
          icon={<svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
        />
        <StatsCard 
          label="Active Clients" 
          value={activeClients} 
          subValue={`Total: ${clients.length}`}
          icon={<svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
      </div>

      {/* Row 4: Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-auto max-h-[400px]">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Top Clients (Download)</h3>
          <div className="space-y-4">
            {[...clients].sort((a,b) => b.currentRx - a.currentRx).slice(0, 5).map(client => (
              <div key={client.id} className="flex items-center justify-between pb-3 border-b border-slate-800 last:border-0">
                <div>
                  <div className="text-sm font-medium text-slate-200">{client.username}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{client.ipAddress}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-indigo-400">{client.currentRx.toFixed(1)} M</div>
                  <div className="text-xs text-slate-500">RX</div>
                </div>
              </div>
            ))}
            {clients.length === 0 && <div className="text-slate-500 text-sm">No clients active</div>}
          </div>
        </div>

        {/* Interface Stats Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm overflow-auto max-h-[400px]">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Interface Status</h3>
            <div className="space-y-3">
              {interfaces.map(iface => (
                <div key={iface.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-800/50 rounded transition-colors">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${iface.status === 'running' ? 'bg-emerald-500' : 'bg-red-500/50'}`}></div>
                    <div>
                      <span className={`block font-medium ${iface.status === 'running' ? 'text-slate-300' : 'text-slate-500'}`}>{iface.name}</span>
                      <span className="text-[10px] text-slate-600 font-mono">{iface.mac}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-300">
                      {iface.status === 'running' ? 
                        `${(iface.currentTx + iface.currentRx).toFixed(1)} Mbps` : 
                        'OFFLINE'
                      }
                    </div>
                    {iface.status === 'running' && (
                       <div className="text-[10px] text-slate-500">Total Traffic</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;