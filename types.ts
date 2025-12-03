export interface TrafficPoint {
  timestamp: string; // HH:mm:ss
  tx: number; // Mbps
  rx: number; // Mbps
}

export interface NetworkInterface {
  id: string;
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
  username: string;
  ipAddress: string;
  uptime: string;
  callerId: string; // MAC address usually
  currentTx: number;
  currentRx: number;
  history: TrafficPoint[];
}

export interface SystemStats {
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
  SETTINGS = 'SETTINGS',
}