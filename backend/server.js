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
  const client = new RouterOSClient({
    host: router.ip,
    user: router.username,
    password: router.password,
    port: parseInt(router.port || 8728),
    keepalive: false, // Close connection after command
    tls: false // Assuming non-secure API port by default, usually 8729 is TLS
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
    // Attempt to close if error occurs
    try { await client.close(); } catch (e) {}
    throw new Error(`API Error: ${error.message}`);
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
  const routerConfig = { id, tenantId, name, ip, username, password, method, port };
  
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

      if (ifaceRes.status === 'fulfilled') interfacesRaw = ifaceRes.value;
      if (resourceRes.status === 'fulfilled') resourceRaw = resourceRes.value[0] || {};
      if (pppRes.status === 'fulfilled') activePppRaw = pppRes.value;

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
    const sysStats = {
      routerId: router.id,
      cpuLoad: parseInt(resourceRaw['cpu-load'] || 0),
      memoryUsage: Math.floor(((parseInt(resourceRaw['total-memory']) - parseInt(resourceRaw['free-memory'])) / parseInt(resourceRaw['total-memory'])) * 100) || 0,
      uptime: resourceRaw['uptime'] || 'unknown',
      boardName: resourceRaw['board-name'] || router.model || 'MikroTik',
      version: resourceRaw['version'] || router.version || 'ROS'
    };

    // 2. Interfaces
    const interfaces = interfacesRaw.map((iface, idx) => {
        // API returns bps, convert to Mbps
        const rxBps = parseInt(iface['rx-bits-per-second'] || 0);
        const txBps = parseInt(iface['tx-bits-per-second'] || 0);
        
        return {
          id: `${router.id}-if-${idx}`,
          routerId: router.id,
          name: iface.name,
          type: iface.type || 'ethernet',
          mac: iface['mac-address'] || '00:00:00:00:00:00',
          status: (iface.running === 'true' || iface.running === true) ? 'running' : 'link-down',
          currentTx: parseFloat((txBps / 1000000).toFixed(2)),
          currentRx: parseFloat((rxBps / 1000000).toFixed(2)),
          history: [] // History is managed by frontend accumulation
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
       const resData = data[0];
       result = { model: resData['board-name'], version: resData['version'] };
    } else {
       const data = await fetchApiData(tempRouter, '/system/resource/print');
       const resData = data[0];
       result = { model: resData['board-name'], version: resData['version'] };
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});