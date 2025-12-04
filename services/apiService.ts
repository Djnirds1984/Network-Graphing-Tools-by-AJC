import { NetworkInterface, PPPoEClient, SystemStats, RouterDevice } from '../types';

// Use relative URL so Nginx can proxy to localhost:3001
// In dev, Vite proxy handles this. In prod, Nginx handles this.
const API_BASE_URL = '/api';

export const apiService = {
  
  // Test connection to a new router
  testConnection: async (config: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Connection failed');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Backend unavailable');
    }
  },

  // Register a router with the backend
  addRouter: async (router: RouterDevice & { password?: string, username?: string, port?: string, method?: string }) => {
    try {
      await fetch(`${API_BASE_URL}/routers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(router)
      });
    } catch (e) {
      console.error("Failed to register router with backend", e);
    }
  },

  // Fetch live stats for a specific router
  getLiveStats: async (routerId: string): Promise<{
    interfaces: NetworkInterface[],
    clients: PPPoEClient[],
    sysStats: SystemStats
  } | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/routers/${routerId}/stats`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Fetch stats failed", e);
      return null;
    }
  }
};