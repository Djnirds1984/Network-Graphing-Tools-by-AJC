import { NetworkInterface, PPPoEClient, SystemStats, TrafficPoint, Tenant, RouterDevice } from '../types';

// --- Helpers ---

const generateTrafficValue = (base: number, variance: number, trend: number): number => {
  const noise = (Math.random() - 0.5) * variance;
  const value = base + noise + Math.sin(Date.now() / 10000) * trend;
  return Math.max(0, parseFloat(value.toFixed(2)));
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// --- Generators ---

// Initial static tenants (for demo/admin view)
const DEFAULT_TENANTS: Tenant[] = [
  { id: 't1', name: 'HQ - Main Office', status: 'active' },
  { id: 't2', name: 'Branch - Downtown', status: 'active' },
];

const DEFAULT_ROUTERS: RouterDevice[] = [
  { id: 'r1', tenantId: 't1', name: 'Core-Gateway', ip: '192.168.88.1', model: 'CCR2004-1G-12S+2XS', version: '7.12.1', isOnline: true },
  { id: 'r2', tenantId: 't1', name: 'Dist-Switch', ip: '192.168.88.2', model: 'CRS317-1G-16S+', version: '7.11.2', isOnline: true },
  { id: 'r3', tenantId: 't2', name: 'Office-Edge', ip: '10.50.0.1', model: 'RB5009UG+S+', version: '7.13beta', isOnline: true },
];

export const generateTenants = (): Tenant[] => {
  return [...DEFAULT_TENANTS];
};

export const generateRouters = (): RouterDevice[] => {
  return [...DEFAULT_ROUTERS];
};

// Helper to create a new Tenant (used by AuthService)
export const createNewTenant = (name: string): Tenant => {
  return {
    id: `t-${Date.now()}`,
    name: name,
    status: 'active'
  };
};

// Helper to create a default Router for a new Tenant
export const createDefaultRouter = (tenantId: string): RouterDevice => {
  return {
    id: `r-${Date.now()}`,
    tenantId: tenantId,
    name: 'Main Gateway',
    ip: '192.168.88.1',
    model: 'RB5009UG+S+',
    version: '7.14.0',
    isOnline: true
  };
};

export const generateInitialInterfaces = (routers: RouterDevice[]): NetworkInterface[] => {
  let allInterfaces: NetworkInterface[] = [];

  routers.forEach(router => {
    let configs: any[] = [];

    // Different interface profiles based on router model
    if (router.model.includes('CCR2004')) {
      configs = [
        { name: 'ether1-wan', type: 'ethernet', active: true },
        { name: 'sfp-plus1-uplink', type: 'ethernet', active: true },
        { name: 'sfp-plus2-server', type: 'ethernet', active: true },
        { name: 'sfp-plus3-lan', type: 'ethernet', active: true },
        { name: 'sfp-plus4', type: 'ethernet', active: false },
      ];
    } else if (router.model.includes('CRS317')) {
      configs = [
        { name: 'sfp1-uplink', type: 'ethernet', active: true },
        { name: 'sfp2-trunk', type: 'ethernet', active: true },
        { name: 'sfp3-floor1', type: 'ethernet', active: true },
        { name: 'sfp4-floor2', type: 'ethernet', active: true },
      ];
    } else {
      // RB5009 or Default
      configs = [
        { name: 'ether1-wan', type: 'ethernet', active: true },
        { name: 'ether2-lan', type: 'ethernet', active: true },
        { name: 'ether3-wifi', type: 'ethernet', active: true },
        { name: 'sfp-plus1', type: 'ethernet', active: false },
      ];
    }

    const routerInterfaces = configs.map((cfg, idx) => ({
      id: `${router.id}-if-${idx}`,
      routerId: router.id,
      name: cfg.name,
      type: cfg.type as any,
      mac: `B8:69:F4:${router.id.substr(0,2)}:${Math.floor(Math.random()*99).toString(16).padStart(2,'0')}:${Math.floor(Math.random()*255).toString(16).padStart(2,'0')}`.toUpperCase(),
      status: (cfg.active ? 'running' : 'link-down') as 'running' | 'disabled' | 'link-down',
      currentTx: 0,
      currentRx: 0,
      history: []
    }));

    allInterfaces = [...allInterfaces, ...routerInterfaces];
  });

  return allInterfaces;
};

export const generateInitialClients = (routers: RouterDevice[]): PPPoEClient[] => {
  let allClients: PPPoEClient[] = [];

  routers.forEach(router => {
    // Only Gateway routers usually have PPPoE clients in this mock scenario
    if (router.name.includes('Switch')) return;

    const count = router.name.includes('Core') ? 8 : 4;
    
    for (let i = 1; i <= count; i++) {
      allClients.push({
        id: `${router.id}-pppoe-${i}`,
        routerId: router.id,
        username: `${router.name.toLowerCase().substring(0,5)}_user_${i}`,
        ipAddress: `10.${router.id.substring(0,2) === 'r1' ? '10' : '20'}.10.${10 + i}`,
        uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
        callerId: `AA:BB:CC:${router.id.substring(0,2)}:00:0${i}`,
        currentTx: 0,
        currentRx: 0,
        history: []
      });
    }
  });

  return allClients;
};

export const generateSystemStats = (routers: RouterDevice[]): Record<string, SystemStats> => {
  const stats: Record<string, SystemStats> = {};
  routers.forEach(r => {
    stats[r.id] = {
      routerId: r.id,
      cpuLoad: Math.floor(Math.random() * 30),
      memoryUsage: Math.floor(20 + Math.random() * 40),
      uptime: '14d 2h 15m',
      boardName: r.model,
      version: r.version
    };
  });
  return stats;
};

// --- Mock Connection Test ---

export const testRouterConnection = async (ip: string, user: string, pass: string, port: string, method: 'api' | 'rest'): Promise<{ model: string, version: string }> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulate failure for specific IPs or bad input
  if (!ip || ip === '0.0.0.0') {
    throw new Error("Unable to connect to host: Host unreachable");
  }

  // Simulate authentication failure
  if (user === 'admin' && pass === 'wrong') {
    throw new Error("Authentication failed: Invalid username or password");
  }

  // Randomly assign a model and version to simulate retrieval from the device
  const models = ['CCR1009-7G-1C', 'RB4011iGS+', 'hAP ax3', 'RB5009UG+S+', 'CCR2004-16G-2S+'];
  const versions = ['6.48.6 (Long-term)', '6.49.10', '7.12.1', '7.13.3', '7.14beta4'];
  
  const randomModel = models[Math.floor(Math.random() * models.length)];
  const randomVersion = versions[Math.floor(Math.random() * versions.length)];

  return {
    model: randomModel,
    version: randomVersion
  };
};

// --- Update Logic ---

export const updateInterfaces = (interfaces: NetworkInterface[]): NetworkInterface[] => {
  const now = formatTime(new Date());
  return interfaces.map(iface => {
    if (iface.status !== 'running') return iface;

    const isWan = iface.name.includes('wan') || iface.name.includes('uplink');
    const isServer = iface.name.includes('server');
    
    let baseTx = 2, baseRx = 2, varianceTx = 1, varianceRx = 1;
    
    if (isWan) {
      baseTx = 45; baseRx = 250;
      varianceTx = 15; varianceRx = 60;
    } else if (isServer) {
      baseTx = 120; baseRx = 80;
      varianceTx = 30; varianceRx = 20;
    } else {
      baseTx = Math.random() * 5;
      baseRx = Math.random() * 10;
    }
    
    const newTx = generateTrafficValue(baseTx, varianceTx, 5);
    const newRx = generateTrafficValue(baseRx, varianceRx, 10);

    const newHistoryPoint: TrafficPoint = { timestamp: now, tx: newTx, rx: newRx };
    const newHistory = [...iface.history, newHistoryPoint].slice(-30);

    return { ...iface, currentTx: newTx, currentRx: newRx, history: newHistory };
  });
};

export const updateClients = (clients: PPPoEClient[]): PPPoEClient[] => {
  const now = formatTime(new Date());
  return clients.map(client => {
    const active = Math.random() > 0.3;
    const base = active ? Math.random() * 15 : 0.1;
    
    const newTx = generateTrafficValue(base, 2, 0);
    const newRx = generateTrafficValue(base * 4, 5, 0);

    const newHistoryPoint: TrafficPoint = { timestamp: now, tx: newTx, rx: newRx };
    const newHistory = [...client.history, newHistoryPoint].slice(-20);

    return { ...client, currentTx: newTx, currentRx: newRx, history: newHistory };
  });
};

export const updateSystemStats = (currentStats: Record<string, SystemStats>): Record<string, SystemStats> => {
  const newStats = { ...currentStats };
  Object.keys(newStats).forEach(routerId => {
    // Random fluctuation
    const stat = newStats[routerId];
    let newCpu = stat.cpuLoad + (Math.floor(Math.random() * 5) - 2);
    let newMem = stat.memoryUsage + (Math.floor(Math.random() * 3) - 1);
    
    newCpu = Math.max(1, Math.min(100, newCpu));
    newMem = Math.max(1, Math.min(100, newMem));

    newStats[routerId] = { ...stat, cpuLoad: newCpu, memoryUsage: newMem };
  });
  return newStats;
};