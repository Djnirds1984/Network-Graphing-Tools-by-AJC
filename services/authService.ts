import { User, Tenant, RouterDevice } from '../types';
import { createNewTenant, createDefaultRouter } from './mockDataService';

const USERS_KEY = 'netgraph_users';
const TENANTS_KEY = 'netgraph_tenants';
const ROUTERS_KEY = 'netgraph_routers';

// --- Mock Database Initialization ---
const initStorage = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    // Default Admin
    const adminUser: User = {
      id: 'u-admin',
      email: 'admin@netgraph.com',
      name: 'Super Admin',
      tenantId: 'admin', // Special ID for superuser
      role: 'admin'
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
  }
};

initStorage();

// --- Helpers ---
const getUsers = (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const setUsers = (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

// Helper to retrieve custom tenants created by users
export const getStoredTenants = (): Tenant[] => {
  const stored = localStorage.getItem(TENANTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getStoredRouters = (): RouterDevice[] => {
  const stored = localStorage.getItem(ROUTERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const setStoredRouters = (routers: RouterDevice[]) => {
  localStorage.setItem(ROUTERS_KEY, JSON.stringify(routers));
};

export const addStoredRouter = (router: RouterDevice) => {
  const current = getStoredRouters();
  setStoredRouters([...current, router]);
};

export const removeStoredRouter = (routerId: string) => {
  const current = getStoredRouters();
  const next = current.filter(r => r.id !== routerId);
  setStoredRouters(next);
};

export const updateStoredRouter = (updated: RouterDevice) => {
  const current = getStoredRouters();
  const next = current.map(r => (r.id === updated.id ? updated : r));
  setStoredRouters(next);
};



// --- Auth Methods ---

export const login = async (email: string, password: string): Promise<{ user: User, token: string }> => {
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    // For mock purposes, any password works if user exists
    return {
      user,
      token: `mock-token-${user.id}-${Date.now()}`
    };
  }
  
  throw new Error('Invalid email or password');
};

export const register = async (name: string, email: string, password: string, orgName: string): Promise<{ user: User, tenant: Tenant, router: RouterDevice }> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('User already exists');
  }

  // 1. Create Tenant
  const newTenant = createNewTenant(orgName);
  const currentTenants = getStoredTenants();
  localStorage.setItem(TENANTS_KEY, JSON.stringify([...currentTenants, newTenant]));

  // 2. Create Default Router for Tenant
  const newRouter = createDefaultRouter(newTenant.id);
  const currentRouters = getStoredRouters();
  localStorage.setItem(ROUTERS_KEY, JSON.stringify([...currentRouters, newRouter]));

  // 3. Create User
  const newUser: User = {
    id: `u-${Date.now()}`,
    email,
    name,
    tenantId: newTenant.id,
    role: 'manager'
  };
  setUsers([...users, newUser]);

  return { user: newUser, tenant: newTenant, router: newRouter };
};

export const logout = () => {
  localStorage.removeItem('netgraph_session');
};
