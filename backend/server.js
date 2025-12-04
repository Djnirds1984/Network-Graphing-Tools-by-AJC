const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { RouterOSClient } = require('mikro-routeros');
const https = require('https');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for router configurations (in a real app, use a DB)
// We only store connection details, not the live stats.
let routers = [];

// Ignore self-signed certs for MikroTik REST API
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// --- Helper: Connect via REST (ROS 7+) ---
const fetchRestData = async (router, endpoint) => {
  const protocol = router.port === '443' ? 'https' : 'http';
  const url = `${protocol}://${router.ip}:${router.port}/rest/${endpoint}`;
  
  try {
    const response = await axios.get(url, {
      auth: { username: router.username, password: router.password },
      httpsAgent: protocol === 'https' ? httpsAgent : undefined,
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error(`REST Error [${router.name}]:`, error.message);
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
  }
};

// --- Helper: Connect via Legacy API (ROS 6/7) using mikro-routeros ---
const fetchApiData = async (router, commandString) => {
  const apiPort = parseInt(router.port || '8728');
  const useTls = apiPort === 8729;
  const client = new RouterOSClient({
    host: router.ip,
    user: router.username,
    password: router.password,
    port: apiPort,
    keepalive: false,
    tls: useTls
  });

  try {
    await client.connect();
    
    // mikro-routeros typically expects command and args as an array
    // Our app sends commands joined by \n (e.g. "/interface/monitor-traffic\n=interface=ether1")
    // We split them to create the protocol array
    const commandArray = commandString.split('\n');
    
    // Execute command
    const data = await client.write(commandArray);
    
    await client.close();
    return data;
  } catch (error) {
    try { await client.close(); } catch (e) {}
    const msg = (error && error.message) ? error.message : String(error);
    throw new Error(`API Error: ${msg}`);
  }
};

// --- Helper: Normalize Interface Data ---
const normalizeInterfaces = (routerId, rawData) => {
  return rawData.map((iface, idx) => ({
    id: `${routerId}-${iface['.id'] || iface['id'] || idx}`,
    routerId: routerId,
    name: iface.name,
    type: iface.type || 'ethernet', // simplify
    mac: iface['mac-address'],
    status: iface.running === 'true' || iface.running === true ? 'running' : 'link-down',
    currentTx: 0, // Rate calculation requires logic on frontend or diffing here
    currentRx: 0,
    // Note: To get rates, we usually need '/interface/monitor-traffic'. 
    // For simplicity in this snapshot, we'll fetch rates separately or assume they are in the data if monitored.
    raw: iface
  }));
};

// --- Endpoints ---

// 1. Add/Update Router Configuration
app.post('/api/routers', (req, res) => {
  const { id, tenantId, name, ip, username, password, method, port } = req.body;
  
  const existingIndex = routers.findIndex(r => r.id === id);
  const routerConfig = {
    id,
    tenantId,
    name,
    ip,
    username: username || 'admin',
    password: password || '',
    method: method || 'api',
    port: port || (method === 'rest' ? '80' : '8728')
  };
  
  if (existingIndex >= 0) {
    routers[existingIndex] = routerConfig;
  } else {
    routers.push(routerConfig);
  }
  
  res.json({ success: true, router: { id, name, ip, method } });
});

// 2. Get Live Stats (Unified)
app.get('/api/routers/:id/stats', async (req, res) => {
  const router = routers.find(r => r.id === req.params.id);
  if (!router) return res.status(404).json({ error: "Router not found" });

  try {
    let interfacesRaw = [];
    let resourceRaw = {};
    let activePppRaw = [];

    // --- STRATEGY: REST (ROS 7) ---
    if (router.method === 'rest') {
      // Parallel fetch
      const [ifaceRes, resourceRes, pppRes, trafficRes] = await Promise.allSettled([
        fetchRestData(router, 'interface'),
        fetchRestData(router, 'system/resource'),
        fetchRestData(router, 'ppp/active'),
        // ROS 7 REST doesn't easily support monitor-traffic POST in one go usually, 
        // we might just get basic counters. For real-time, API is better.
        // We will try to just get the interface list for now.
        Promise.resolve([]) 
      ]);

      if (ifaceRes.status === 'fulfilled') {
        const v = ifaceRes.value;
        interfacesRaw = Array.isArray(v) ? v : (v?.items || v?.data || []);
      }
      if (resourceRes.status === 'fulfilled') {
        const v = resourceRes.value;
        resourceRaw = Array.isArray(v) ? (v[0] || {}) : (v || {});
      }
      if (pppRes.status === 'fulfilled') {
        const v = pppRes.value;
        activePppRaw = Array.isArray(v) ? v : (v?.items || []);
      }

    } 
    // --- STRATEGY: LEGACY API (ROS 6/7) ---
    else {
      // Sequential or Parallel Promise
      interfacesRaw = await fetchApiData(router, '/interface/print');
      
      const resArr = await fetchApiData(router, '/system/resource/print');
      resourceRaw = resArr[0] || {};
      
      activePppRaw = await fetchApiData(router, '/ppp/active/print');
      
      // Get Traffic Monitor (Snapshot)
      // Getting traffic via API requires a continuous stream or a specific 'monitor-traffic' command
      // which is complex for a simple poll. We will rely on TX/RX byte counters from /interface/print 
      // and calculate rate on frontend, OR fetch monitor-traffic for active interfaces.
      // For this implementation, we will fetch monitor-traffic for ALL interfaces once.
      
      // Getting names
      const names = interfacesRaw.map(i => i.name).join(',');
      try {
        // Construct the array of arguments for monitor-traffic
        const trafficCmd = `/interface/monitor-traffic\n=interface=${names}\n=once=`;
        const trafficRaw = await fetchApiData(router, trafficCmd);
        
        // Merge traffic data
        interfacesRaw = interfacesRaw.map(i => {
           const t = trafficRaw.find(tr => tr.name === i.name);
           if (t) {
             return { ...i, ...t }; // Adds 'rx-bits-per-second', 'tx-bits-per-second'
           }
           return i;
        });
      } catch (e) {
        console.log("Traffic monitor failed, falling back to counters", e);
      }
    }

    // --- Transform Data for Frontend ---
    
    // 1. System Stats
    const totalMem = parseInt(resourceRaw['total-memory'] ?? resourceRaw.total_memory ?? '0');
    const freeMem = parseInt(resourceRaw['free-memory'] ?? resourceRaw.free_memory ?? '0');
    const cpuLoad = parseInt(resourceRaw['cpu-load'] ?? resourceRaw.cpu_load ?? '0') || 0;
    const memoryUsage = totalMem && freeMem ? Math.floor(((totalMem - freeMem) / totalMem) * 100) : 0;
    const sysStats = {
      routerId: router.id,
      cpuLoad,
      memoryUsage,
      uptime: resourceRaw['uptime'] || resourceRaw.uptime || 'unknown',
      boardName: resourceRaw['board-name'] || resourceRaw['board_name'] || resourceRaw.boardName || router.model || 'MikroTik',
      version: resourceRaw['version'] || resourceRaw.version || router.version || 'ROS'
    };

    // 2. Interfaces
    const interfaces = (Array.isArray(interfacesRaw) ? interfacesRaw : []).map((iface, idx) => {
        const rxBps = parseInt(iface['rx-bits-per-second'] ?? '0');
        const txBps = parseInt(iface['tx-bits-per-second'] ?? '0');
        const name = iface.name || iface['name'] || `if-${idx}`;
        const running = iface.running === 'true' || iface.running === true;
        return {
          id: `${router.id}-if-${idx}`,
          routerId: router.id,
          name,
          type: iface.type || 'ethernet',
          mac: iface['mac-address'] || '00:00:00:00:00:00',
          status: running ? 'running' : 'link-down',
          currentTx: parseFloat(((txBps || 0) / 1000000).toFixed(2)),
          currentRx: parseFloat(((rxBps || 0) / 1000000).toFixed(2)),
          history: []
        };
    });

    // 3. PPPoE Clients
    const clients = activePppRaw.map((ppp, idx) => ({
      id: `${router.id}-ppp-${idx}`,
      routerId: router.id,
      username: ppp.name,
      ipAddress: ppp.address,
      uptime: ppp.uptime,
      callerId: ppp['caller-id'] || 'N/A',
      currentTx: 0, // Basic PPP print doesn't give rate. Requires queue monitoring.
      currentRx: 0,
      history: []
    }));

    res.json({
      sysStats,
      interfaces,
      clients
    });

  } catch (err) {
    console.error("Stats Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Test Connection Endpoint
app.post('/api/test-connection', async (req, res) => {
  const { ip, port, username, password, method } = req.body;
  
  const tempRouter = { 
    id: 'test', name: 'Test', ip, port, username, password, method 
  };

  try {
    let result = {};
    if (method === 'rest') {
       const data = await fetchRestData(tempRouter, 'system/resource');
       const resData = Array.isArray(data) ? (data[0] || {}) : (data || {});
       result = { model: resData['board-name'] || 'MikroTik', version: resData['version'] || 'ROS' };
    } else {
       const data = await fetchApiData(tempRouter, '/system/resource/print');
       const resData = (Array.isArray(data) ? data[0] : data) || {};
       result = { model: resData['board-name'] || 'MikroTik', version: resData['version'] || 'ROS' };
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});