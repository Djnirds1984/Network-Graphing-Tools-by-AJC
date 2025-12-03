import { NetworkInterface, PPPoEClient, SystemStats, TrafficPoint } from '../types';

// Helpers to generate somewhat realistic-looking network noise
const generateTrafficValue = (base: number, variance: number, trend: number): number => {
  const noise = (Math.random() - 0.5) * variance;
  const value = base + noise + Math.sin(Date.now() / 10000) * trend;
  return Math.max(0, parseFloat(value.toFixed(2)));
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Initial State Generators
export const generateInitialInterfaces = (): NetworkInterface[] => {
  // Define 10 interfaces: 8 Ethernet, 2 SFP+
  // Explicitly defined ether1-wan as requested
  const configs = [
    { id: 'ether1', name: 'ether1-wan', type: 'ethernet' as const, isActive: true },
    { id: 'ether2', name: 'ether2-lan', type: 'ethernet' as const, isActive: true },
    { id: 'ether3', name: 'ether3-iot', type: 'ethernet' as const, isActive: true },
    { id: 'ether4', name: 'ether4-guest', type: 'ethernet' as const, isActive: true },
    { id: 'ether5', name: 'ether5-cam', type: 'ethernet' as const, isActive: true },
    { id: 'ether6', name: 'ether6', type: 'ethernet' as const, isActive: false },
    { id: 'ether7', name: 'ether7', type: 'ethernet' as const, isActive: false },
    { id: 'ether8', name: 'ether8', type: 'ethernet' as const, isActive: false },
    { id: 'sfp1', name: 'sfp-plus1-uplink', type: 'ethernet' as const, isActive: true },
    { id: 'sfp2', name: 'sfp-plus2-server', type: 'ethernet' as const, isActive: true },
  ];

  return configs.map(cfg => ({
    id: cfg.id,
    name: cfg.name,
    type: cfg.type,
    mac: `B8:69:F4:${Math.floor(Math.random()*99).toString(16).padStart(2,'0')}:${Math.floor(Math.random()*99).toString(16).padStart(2,'0')}:${Math.floor(Math.random()*255).toString(16).padStart(2,'0')}`.toUpperCase(),
    status: cfg.isActive ? 'running' : 'link-down',
    currentTx: 0,
    currentRx: 0,
    history: []
  }));
};

export const generateInitialClients = (): PPPoEClient[] => {
  const clients: PPPoEClient[] = [];
  for (let i = 1; i <= 8; i++) {
    clients.push({
      id: `pppoe-${i}`,
      username: `user_${i}`,
      ipAddress: `10.0.10.${10 + i}`,
      uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
      callerId: `AA:BB:CC:DD:00:0${i}`,
      currentTx: 0,
      currentRx: 0,
      history: []
    });
  }
  return clients;
};

// Update Function to simulate a "tick"
export const updateInterfaces = (interfaces: NetworkInterface[]): NetworkInterface[] => {
  const now = formatTime(new Date());
  return interfaces.map(iface => {
    if (iface.status !== 'running') return iface;

    // Simulate different loads based on interface name
    const isWan = iface.name.includes('wan') || iface.name.includes('uplink');
    const isServer = iface.name.includes('server');
    
    // Different traffic profiles
    let baseTx = 5, baseRx = 5, varianceTx = 2, varianceRx = 2;
    
    if (isWan) {
      // WAN usually has higher load
      baseTx = 45; baseRx = 250;
      varianceTx = 15; varianceRx = 60;
    } else if (isServer) {
      // Servers often have high Tx (sending data to LAN)
      baseTx = 120; baseRx = 80;
      varianceTx = 30; varianceRx = 20;
    } else {
      // Standard LAN ports
      baseTx = Math.random() * 10;
      baseRx = Math.random() * 30;
    }
    
    const newTx = generateTrafficValue(baseTx, varianceTx, 5);
    const newRx = generateTrafficValue(baseRx, varianceRx, 10);

    const newHistoryPoint: TrafficPoint = { timestamp: now, tx: newTx, rx: newRx };
    // Keep last 30 points
    const newHistory = [...iface.history, newHistoryPoint].slice(-30);

    return {
      ...iface,
      currentTx: newTx,
      currentRx: newRx,
      history: newHistory
    };
  });
};

export const updateClients = (clients: PPPoEClient[]): PPPoEClient[] => {
  const now = formatTime(new Date());
  return clients.map(client => {
    // Random activity bursts
    const active = Math.random() > 0.3;
    const base = active ? Math.random() * 20 : 0.1;
    
    const newTx = generateTrafficValue(base, 2, 0);
    const newRx = generateTrafficValue(base * 4, 5, 0); // Downstream usually higher

    const newHistoryPoint: TrafficPoint = { timestamp: now, tx: newTx, rx: newRx };
    const newHistory = [...client.history, newHistoryPoint].slice(-20);

    return {
      ...client,
      currentTx: newTx,
      currentRx: newRx,
      history: newHistory
    };
  });
};

export const getSystemStats = (): SystemStats => {
  return {
    cpuLoad: Math.floor(10 + Math.random() * 15),
    memoryUsage: Math.floor(40 + Math.random() * 5),
    uptime: '14d 2h 15m',
    boardName: 'MikroTik CCR2004',
    version: '7.12.1 (stable)'
  };
};