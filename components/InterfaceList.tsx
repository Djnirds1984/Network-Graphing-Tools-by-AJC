import React, { useState } from 'react';
import { NetworkInterface } from '../types';
import NetworkGraph from './NetworkGraph';

interface InterfaceListProps {
  interfaces: NetworkInterface[];
}

const InterfaceList: React.FC<InterfaceListProps> = ({ interfaces }) => {
  // Default to showing all interfaces initially
  const [selectedIds, setSelectedIds] = useState<string[]>(interfaces.map(i => i.id));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleInterface = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => setSelectedIds(interfaces.map(i => i.id));
  const selectNone = () => setSelectedIds([]);

  const filteredInterfaces = interfaces.filter(i => selectedIds.includes(i.id));

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Interfaces</h2>
          <p className="text-slate-400 text-sm">Detailed traffic analysis per physical interface.</p>
        </div>
        
        {/* Interface Selection Dropdown */}
        <div className="relative z-20">
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-full md:w-72 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors shadow-sm"
            >
                <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    <span className="text-sm font-medium">
                        {selectedIds.length === interfaces.length 
                            ? 'All Interfaces Visible' 
                            : `${selectedIds.length} Interfaces Selected`}
                    </span>
                </div>
                <svg className={`w-4 h-4 ml-2 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isDropdownOpen && (
                <>
                <div className="fixed inset-0" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5">
                    <div className="p-2 border-b border-slate-800 flex justify-between bg-slate-800/50">
                        <button onClick={selectAll} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors">Select All</button>
                        <button onClick={selectNone} className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors">Clear</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {interfaces.map(iface => (
                            <button
                                key={iface.id}
                                onClick={() => toggleInterface(iface.id)}
                                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all ${
                                    selectedIds.includes(iface.id) 
                                    ? 'bg-cyan-900/30 text-cyan-400' 
                                    : 'text-slate-400 hover:bg-slate-800'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors ${
                                    selectedIds.includes(iface.id) 
                                    ? 'bg-cyan-500 border-cyan-500' 
                                    : 'border-slate-600 bg-slate-800'
                                }`}>
                                    {selectedIds.includes(iface.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="flex-1 text-left truncate font-mono">{iface.name}</span>
                                {iface.status === 'running' ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" title="Link Up"></span>
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-700" title="Link Down"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                </>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredInterfaces.map(iface => (
          <div key={iface.id} className="bg-slate-900 border border-slate-800 rounded-xl p-0 overflow-hidden animate-fade-in">
             <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${iface.status === 'running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                   <h3 className="font-bold text-slate-200">{iface.name}</h3>
                   <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono hidden sm:inline-block">
                     {iface.mac}
                   </span>
                </div>
                <div className="text-xs text-slate-400 font-mono uppercase tracking-wider bg-slate-800 px-2 py-1 rounded">
                   {iface.type}
                </div>
             </div>
             <div className="p-4">
               <div className="flex gap-8 mb-4">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Current TX</span>
                    <div className="text-lg font-bold text-cyan-400">{iface.currentTx.toFixed(2)} <span className="text-xs text-slate-500 font-normal">Mbps</span></div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Current RX</span>
                    <div className="text-lg font-bold text-purple-400">{iface.currentRx.toFixed(2)} <span className="text-xs text-slate-500 font-normal">Mbps</span></div>
                  </div>
               </div>
               <NetworkGraph 
                data={iface.history} 
                title="" 
                height={180} 
                className="!bg-transparent !border-0 !p-0 !shadow-none"
               />
             </div>
          </div>
        ))}
        
        {filteredInterfaces.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <div className="bg-slate-800 p-3 rounded-full mb-3">
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-slate-500 text-sm">No interfaces selected.</p>
                <button onClick={selectAll} className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">Show All Interfaces</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default InterfaceList;