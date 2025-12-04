import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InterfaceList from './components/InterfaceList';
import ClientList from './components/ClientList';
import NetworkTopology from './components/NetworkTopology';
import RouterManager from './components/RouterManager';
import AuthPage from './components/AuthPage';
import { AppView, NetworkInterface, PPPoEClient, SystemStats, Tenant, RouterDevice, User, TrafficPoint } from './types';

import { getStoredTenants, getStoredRouters, addStoredRouter, logout } from './services/authService';
import { apiService } from './services/apiService';

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);

  // --- View State ---
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD);
  
  // --- Structural Data ---
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [routers, setRouters] = useState<RouterDevice[]>([]);
  
  // Selection State
  const [selectedRouterId, setSelectedRouterId] = useState<string>('');

  // --- Dynamic Data ---
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [clients, setClients] = useState<PPPoEClient[]>([]);
  const [sysStatsMap, setSysStatsMap] = useState<Record<string, SystemStats>>({});

  // Flag to toggle between Mock and Real Backend
  // In a real build, this might be an env var. For this hybrid app, we check if the router has credentials stored locally (simplified).
  // For now, we assume if it's a "stored" router (id starts with 'r-'), we try the backend.
  
  // 1. Initial Data Loading (Static Defaults + Stored User Data)
  useEffect(() => {
    const storedTenants = getStoredTenants();
    const storedRouters = getStoredRouters();
    setTenants(storedTenants);
    setRouters(storedRouters);
    setInterfaces([]);
    setClients([]);
    setSysStatsMap({});
  }, []);

  // 2. Set Default Selection Logic
  useEffect(() => {
    if (user && routers.length > 0) {
      if (!selectedRouterId) {
        // If Admin, select first available router
        if (user.tenantId === 'admin') {
          setSelectedRouterId(routers[0].id);
        } else {
          // If Tenant User, select THEIR first router
          const myRouters = routers.filter(r => r.tenantId === user.tenantId);
          if (myRouters.length > 0) {
            setSelectedRouterId(myRouters[0].id);
          }
        }
      }
    }
  }, [user, routers, selectedRouterId]);

  // 3. Helper to update history (Append new point to existing array)
  const appendHistory = (currentHistory: TrafficPoint[], newTx: number, newRx: number): TrafficPoint[] => {
     const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
     return [...currentHistory, { timestamp: now, tx: newTx, rx: newRx }].slice(-30);
  };

  // 4. Data Refresh Loop (Handles both Mock and Real)
  useEffect(() => {
    if (!user) return; // Only run sim if logged in

    const fetchData = async () => {
      // Check if selected router is a "Mock" router (ids like 'r1', 'r2') or a "Real" router (ids like 'r-17...')
      const isRealRouter = selectedRouterId && selectedRouterId.startsWith('r-');
      
      if (isRealRouter) {
        // --- REAL BACKEND MODE ---
        try {
          const liveData = await apiService.getLiveStats(selectedRouterId);
          
          if (liveData) {
            // Update System Stats
            setSysStatsMap(prev => ({
              ...prev,
              [selectedRouterId]: liveData.sysStats
            }));

            // Update Interfaces (Merge with existing to keep history)
            setInterfaces(prevInterfaces => {
              const routerInterfaces = prevInterfaces.filter(i => i.routerId !== selectedRouterId);
              const currentRouterInterfaces = prevInterfaces.filter(i => i.routerId === selectedRouterId);
              
              const updated = liveData.interfaces.map(newIface => {
                 const existing = currentRouterInterfaces.find(e => e.name === newIface.name);
                 return {
                   ...newIface,
                   history: appendHistory(existing?.history || [], newIface.currentTx, newIface.currentRx)
                 };
              });
              return [...routerInterfaces, ...updated];
            });

            // Update Clients
            setClients(prevClients => {
              const routerClients = prevClients.filter(c => c.routerId !== selectedRouterId);
              // For clients, simple replace usually works, but we can try to preserve history if IDs match
              const updated = liveData.clients.map(newClient => {
                 const existing = prevClients.find(c => c.username === newClient.username && c.routerId === selectedRouterId);
                 return {
                   ...newClient,
                   history: appendHistory(existing?.history || [], newClient.currentTx, newClient.currentRx)
                 };
              });
              return [...routerClients, ...updated];
            });
          }
        } catch (err) {
          console.warn("Failed to fetch from backend, make sure server.js is running.");
        }

      } else {
        return;
      }
    };

    // Run every 2 seconds for API (less aggressive than mock) or 1.5s for mock
    const intervalTime = selectedRouterId.startsWith('r-') ? 2000 : 1500;
    const intervalId = setInterval(fetchData, intervalTime);

    return () => clearInterval(intervalId);
  }, [user, selectedRouterId, routers]);

  // --- Handlers ---
  
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleRegisterSuccess = (newTenant: Tenant) => {
    setTenants(prev => [...prev, newTenant]);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setSelectedRouterId('');
  };

  const handleAddRouter = (newRouter: RouterDevice) => {
    setRouters(prev => [...prev, newRouter]);
    addStoredRouter(newRouter);
    apiService.addRouter(newRouter);
    setSelectedRouterId(newRouter.id);
  };

  // --- Filtering Logic for Multi-Tenancy ---

  // Filter Tenants visible to current user
  const visibleTenants = useMemo(() => {
    if (!user) return [];
    if (user.tenantId === 'admin') return tenants;
    return tenants.filter(t => t.id === user.tenantId);
  }, [tenants, user]);

  // Filter Routers visible to current user
  const visibleRouters = useMemo(() => {
    if (!user) return [];
    if (user.tenantId === 'admin') return routers;
    return routers.filter(r => r.tenantId === user.tenantId);
  }, [routers, user]);

  // Filter Metrics based on selected router
  const activeInterfaces = useMemo(() => 
    interfaces.filter(i => i.routerId === selectedRouterId), 
  [interfaces, selectedRouterId]);

  const activeClients = useMemo(() => 
    clients.filter(c => c.routerId === selectedRouterId), 
  [clients, selectedRouterId]);

  const activeSysStats = sysStatsMap[selectedRouterId] || {
    routerId: selectedRouterId,
    cpuLoad: 0,
    memoryUsage: 0,
    uptime: '-',
    boardName: 'Loading...',
    version: '-'
  };

  // --- Render ---

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegisterSuccess={handleRegisterSuccess} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard interfaces={activeInterfaces} clients={activeClients} sysStats={activeSysStats} />;
      case AppView.INTERFACES:
        return <InterfaceList interfaces={activeInterfaces} />;
      case AppView.PPPOE:
        return <ClientList clients={activeClients} />;
      case AppView.TOPOLOGY:
        return <NetworkTopology interfaces={activeInterfaces} clients={activeClients} />;
      case AppView.ROUTERS:
        return (
          <RouterManager 
            routers={visibleRouters} 
            onAddRouter={handleAddRouter} 
            tenantId={user.tenantId} 
          />
        );
      case AppView.SETTINGS:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 animate-fade-in">
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 max-w-lg text-center shadow-lg">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-1">Account Settings</h3>
                <p className="text-sm text-cyan-400 mb-4">{user.email}</p>
                <p className="mb-6 text-sm">
                   Role: <strong className="uppercase">{user.role}</strong><br/>
                   Organization: <strong>{visibleTenants.find(t => t.id === user.tenantId)?.name || 'N/A'}</strong>
                </p>
                <button 
                  onClick={handleLogout}
                  className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/50 transition-colors"
                >
                  Sign Out
                </button>
             </div>
          </div>
        );
      default:
        return <Dashboard interfaces={activeInterfaces} clients={activeClients} sysStats={activeSysStats} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        tenants={visibleTenants}
        routers={visibleRouters}
        selectedRouterId={selectedRouterId}
        onSelectRouter={setSelectedRouterId}
      />
      
      <main className="flex-1 overflow-auto bg-slate-950 relative">
        <div className="p-8 max-w-7xl mx-auto h-full">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;