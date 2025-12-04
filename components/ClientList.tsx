import React, { useState, useEffect } from 'react';
import { PPPoEClient } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import NetworkGraph from './NetworkGraph';

interface ClientListProps {
  clients: PPPoEClient[];
}

const ClientList: React.FC<ClientListProps> = ({ clients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<PPPoEClient | null>(null);

  const filteredClients = clients.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.ipAddress.includes(searchTerm)
  );

  useEffect(() => {
    if (selectedClient) {
      const latest = clients.find(c => c.id === selectedClient.id);
      if (latest) setSelectedClient(latest);
    }
  }, [clients]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">PPPoE Clients</h2>
          <p className="text-slate-400 text-sm">Active sessions and bandwidth usage.</p>
        </div>
        <div className="relative">
           <input 
             type="text" 
             placeholder="Search user or IP..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-2.5"
           />
           <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
             <svg className="w-4 h-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
             </svg>
           </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3">User / IP</th>
                <th scope="col" className="px-6 py-3">MAC / Caller ID</th>
                <th scope="col" className="px-6 py-3">Uptime</th>
                <th scope="col" className="px-6 py-3 text-right">Download (Live)</th>
                <th scope="col" className="px-6 py-3 text-right">Upload (Live)</th>
                <th scope="col" className="px-6 py-3 w-48 text-center">Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr 
                  key={client.id} 
                  onClick={() => setSelectedClient(client)}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                    <div>{client.username}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{client.ipAddress}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{client.callerId}</td>
                  <td className="px-6 py-4">{client.uptime}</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                    {client.currentRx.toFixed(2)} M
                  </td>
                  <td className="px-6 py-4 text-right text-cyan-400 font-bold">
                    {client.currentTx.toFixed(2)} M
                  </td>
                  <td className="px-6 py-2">
                     <div className="h-10 w-full pointer-events-none">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={client.history}>
                            <Area type="monotone" dataKey="rx" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={1} isAnimationActive={true} animationDuration={400} />
                            <Area type="monotone" dataKey="tx" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={1} isAnimationActive={true} animationDuration={400} />
                         </AreaChart>
                       </ResponsiveContainer>
                     </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-slate-600 italic">
                     No clients found matching your search.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedClient(null)}
          ></div>
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fade-in-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{selectedClient.username}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-emerald-400 font-medium uppercase">Connected</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">IP Address</div>
                  <div className="font-mono text-slate-200">{selectedClient.ipAddress}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">MAC Address</div>
                  <div className="font-mono text-slate-200 text-sm truncate" title={selectedClient.callerId}>{selectedClient.callerId}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Uptime</div>
                  <div className="font-mono text-slate-200">{selectedClient.uptime}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Session ID</div>
                  <div className="font-mono text-slate-200">#{selectedClient.id.split('-')[1]}</div>
                </div>
              </div>

              {/* Big Traffic Stats */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-900/30">
                    <div className="text-xs text-emerald-500 uppercase font-bold mb-1">Current Download</div>
                    <div className="text-2xl font-bold text-emerald-400">{selectedClient.currentRx.toFixed(2)} <span className="text-sm font-normal text-emerald-600">Mbps</span></div>
                 </div>
                 <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-900/30">
                    <div className="text-xs text-cyan-500 uppercase font-bold mb-1">Current Upload</div>
                    <div className="text-2xl font-bold text-cyan-400">{selectedClient.currentTx.toFixed(2)} <span className="text-sm font-normal text-cyan-600">Mbps</span></div>
                 </div>
              </div>

              {/* History Graph */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Traffic History</h4>
                <NetworkGraph 
                  data={selectedClient.history} 
                  title="Session Bandwidth Usage" 
                  height={250}
                  className="bg-slate-800/30"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/20 flex justify-end shrink-0 rounded-b-2xl">
               <button 
                onClick={() => setSelectedClient(null)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600"
               >
                 Close Details
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;