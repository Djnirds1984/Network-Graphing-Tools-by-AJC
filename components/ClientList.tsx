import React, { useState } from 'react';
import { PPPoEClient } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ClientListProps {
  clients: PPPoEClient[];
}

const ClientList: React.FC<ClientListProps> = ({ clients }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.ipAddress.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
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
                <tr key={client.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">
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
                     <div className="h-10 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={client.history}>
                            <Area type="monotone" dataKey="rx" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
                            <Area type="monotone" dataKey="tx" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
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
    </div>
  );
};

export default ClientList;
