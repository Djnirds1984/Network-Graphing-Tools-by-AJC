export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string; // 'admin' for superuser, or specific tenant ID
  role: 'admin' | 'viewer' | 'manager';
}

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface RouterDevice {
  id: string;
  tenantId: string;
  name: string;
  ip: string;
  model: string;
  version: string;
  isOnline: boolean;
  username?: string;
  password?: string;
  port?: string;
  method?: 'api' | 'rest';
}

export interface TrafficPoint {
  timestamp: string; // HH:mm:ss
  tx: number; // Mbps
  rx: number; // Mbps
}

export interface NetworkInterface {
  id: string;
  routerId: string; // Link to Router
  name: string;
  type: 'ethernet' | 'pppoe' | 'bridge' | 'vlan';
  mac: string;
  status: 'running' | 'disabled' | 'link-down';
  currentTx: number;
  currentRx: number;
  history: TrafficPoint[];
}

export interface PPPoEClient {
  id: string;
  routerId: string; // Link to Router
  username: string;
  ipAddress: string;
  uptime: string;
  callerId: string; // MAC address usually
  currentTx: number;
  currentRx: number;
  history: TrafficPoint[];
}

export interface SystemStats {
  routerId: string;
  cpuLoad: number;
  memoryUsage: number;
  uptime: string;
  boardName: string;
  version: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INTERFACES = 'INTERFACES',
  PPPOE = 'PPPOE',
  TOPOLOGY = 'TOPOLOGY',
  ROUTERS = 'ROUTERS',
  SETTINGS = 'SETTINGS',
}