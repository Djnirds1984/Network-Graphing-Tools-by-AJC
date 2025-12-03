import React, { useState } from 'react';
import { AppView, Tenant, RouterDevice } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  tenants: Tenant[];
  routers: RouterDevice[];
  selectedRouterId: string;
  onSelectRouter: (routerId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  tenants, 
  routers, 
  selectedRouterId,
  onSelectRouter
}) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const selectedRouter = routers.find(r => r.id === selectedRouterId);
  const selectedTenant = tenants.find(t => t.id === selectedRouter?.tenantId);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: AppView.ROUTERS, label: 'Routers', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
    { id: AppView.TOPOLOGY, label: 'Topology', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { id: AppView.INTERFACES, label: 'Interfaces', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }, 
    { id: AppView.PPPOE, label: 'PPPoE Clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: AppView.SETTINGS, label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold text-cyan-400 tracking-wider">NET<span className="text-slate-100">GRAPH</span></h1>
        
        {/* Context Switcher */}
        <div className="mt-6 relative">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Current Device</label>
          <button 
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-2.5 transition-colors group"
          >
            <div className="flex flex-col items-start overflow-hidden">
               <span className="text-sm font-semibold text-slate-200 truncate w-full text-left">{selectedRouter?.name || 'Select Router'}</span>
               <span className="text-[10px] text-slate-500 truncate w-full text-left group-hover:text-cyan-400 transition-colors">{selectedTenant?.name || 'Unknown Tenant'}</span>
            </div>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {isSelectorOpen && (
             <>
             <div className="fixed inset-0 cursor-default" onClick={() => setIsSelectorOpen(false)}></div>
             <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black ring-opacity-50">
                <div className="max-h-[300px] overflow-y-auto py-1">
                  {tenants.map(tenant => (
                    <div key={tenant.id}>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase bg-slate-900/50 mt-1 first:mt-0">
                        {tenant.name}
                      </div>
                      {routers.filter(r => r.tenantId === tenant.id).map(router => (
                        <button
                          key={router.id}
                          onClick={() => {
                            onSelectRouter(router.id);
                            setIsSelectorOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-700 ${selectedRouterId === router.id ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300'}`}
                        >
                          <span>{router.name}</span>
                          {selectedRouterId === router.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
             </div>
             </>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 group ${
              currentView === item.id 
                ? 'bg-cyan-500/10 text-cyan-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full animate-pulse ${selectedRouter?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-slate-500 font-mono">{selectedRouter?.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">{selectedRouter?.ip}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;