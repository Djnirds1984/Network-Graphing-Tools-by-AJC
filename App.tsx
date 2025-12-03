import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InterfaceList from './components/InterfaceList';
import ClientList from './components/ClientList';
import NetworkTopology from './components/NetworkTopology';
import { AppView, NetworkInterface, PPPoEClient, SystemStats } from './types';
import { 
  generateInitialInterfaces, 
  generateInitialClients, 
  updateInterfaces, 
  updateClients, 
  getSystemStats 
} from './services/mockDataService';

const App: React.FC = () => {
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD);
  
  // State for data
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>(generateInitialInterfaces());
  const [clients, setClients] = useState<PPPoEClient[]>(generateInitialClients());
  const [sysStats, setSysStats] = useState<SystemStats>(getSystemStats());

  // Simulation Loop
  useEffect(() => {
    const intervalId = setInterval(() => {
      setInterfaces(prev => updateInterfaces(prev));
      setClients(prev => updateClients(prev));
      // Randomly update system stats occasionally
      if (Math.random() > 0.8) {
        setSysStats(getSystemStats());
      }
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(intervalId);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard interfaces={interfaces} clients={clients} sysStats={sysStats} />;
      case AppView.INTERFACES:
        return <InterfaceList interfaces={interfaces} />;
      case AppView.PPPOE:
        return <ClientList clients={clients} />;
      case AppView.TOPOLOGY:
        return <NetworkTopology interfaces={interfaces} clients={clients} />;
      case AppView.SETTINGS:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 max-w-lg text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Settings & Configuration</h3>
                <p className="mb-4">
                   This app is currently running in <strong>Simulation Mode</strong>. 
                   To connect to a live RouterOS device, a backend proxy service is required to handle SNMP or API requests due to browser security restrictions.
                </p>
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-sm">
                   Configure API Endpoint
                </button>
             </div>
          </div>
        );
      default:
        return <Dashboard interfaces={interfaces} clients={clients} sysStats={sysStats} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      <Sidebar currentView={currentView} setView={setView} />
      
      <main className="flex-1 overflow-auto bg-slate-950 relative">
        {/* Top bar mobile overlay could go here */}
        
        <div className="p-8 max-w-7xl mx-auto h-full">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;