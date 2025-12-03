import React, { useMemo } from 'react';
import { NetworkInterface, PPPoEClient } from '../types';

interface NetworkTopologyProps {
  interfaces: NetworkInterface[];
  clients: PPPoEClient[];
}

// Helper to distribute points along a line or curve
const calculatePositions = (interfaces: NetworkInterface[], clients: PPPoEClient[], width: number, height: number) => {
  const routerPos = { x: width / 2, y: 150 };
  const internetPos = { x: width / 2, y: 40 };

  // Filter running interfaces
  const activeIfaces = interfaces.filter(i => i.status === 'running');
  // Sort: WAN first, then others
  activeIfaces.sort((a, b) => {
    if (a.name.includes('wan') || a.name.includes('uplink')) return -1;
    if (b.name.includes('wan') || b.name.includes('uplink')) return 1;
    return 0;
  });

  const ifaceY = 350;
  const ifaceSpacing = width / (activeIfaces.length + 1);

  const ifaceNodes = activeIfaces.map((iface, index) => ({
    ...iface,
    x: ifaceSpacing * (index + 1),
    y: ifaceY,
  }));

  // Distribute clients under LAN interfaces
  // Since we don't have explicit linking in mock data, we hash client ID to assign to a non-WAN interface
  const lanIfaces = ifaceNodes.filter(i => !i.name.includes('wan') && !i.name.includes('uplink'));
  
  const clientNodes = clients.map((client, index) => {
    // Deterministic assignment
    const targetIfaceIndex = index % (lanIfaces.length || 1);
    const parent = lanIfaces[targetIfaceIndex] || ifaceNodes[0]; 
    
    // Fan out under parent
    const offset = (index % 3) * 60 - 60; // Simple staggered offset
    
    return {
      ...client,
      x: parent.x + offset,
      y: parent.y + 150 + (index % 2) * 40, // stagger Y slightly
      parentId: parent.id,
      parentX: parent.x,
      parentY: parent.y
    };
  });

  return { routerPos, internetPos, ifaceNodes, clientNodes };
};

const NetworkTopology: React.FC<NetworkTopologyProps> = ({ interfaces, clients }) => {
  const width = 1000;
  const height = 650;
  
  const { routerPos, internetPos, ifaceNodes, clientNodes } = useMemo(() => 
    calculatePositions(interfaces, clients, width, height), 
    [interfaces.map(i => i.id).join(','), clients.length] // Re-calc mainly on structural changes
  );

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-100">Network Topology</h2>
        <p className="text-slate-400 text-sm">Visual map of physical interfaces and connected clients.</p>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-inner">
        {/* Interactive Container - could add zoom/pan later */}
        <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full max-w-[1000px] max-h-[650px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
              </marker>
              <linearGradient id="linkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Links: Router to Internet */}
            <line 
              x1={routerPos.x} y1={routerPos.y - 30} 
              x2={internetPos.x} y2={internetPos.y + 30} 
              stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" 
            />

            {/* Links: Router to Interfaces */}
            {ifaceNodes.map(node => (
              <g key={`link-router-${node.id}`}>
                <line 
                  x1={routerPos.x} y1={routerPos.y + 30} 
                  x2={node.x} y2={node.y - 30} 
                  stroke={node.name.includes('wan') ? '#ef4444' : '#334155'} 
                  strokeWidth="2"
                />
                {/* Traffic Activity Dots */}
                {(node.currentTx > 1 || node.currentRx > 1) && (
                   <circle r="3" fill={node.name.includes('wan') ? '#fca5a5' : '#67e8f9'}>
                     <animateMotion dur={`${Math.max(0.5, 50 / (node.currentRx + 1))}s`} repeatCount="indefinite">
                       <mpath href={`#path-router-${node.id}`} />
                     </animateMotion>
                   </circle>
                )}
                {/* Hidden path for animation */}
                <path 
                    id={`path-router-${node.id}`} 
                    d={`M ${routerPos.x} ${routerPos.y} L ${node.x} ${node.y}`} 
                    fill="none" 
                    stroke="none" 
                />
              </g>
            ))}

            {/* Links: Interfaces to Clients */}
            {clientNodes.map(node => (
              <line 
                key={`link-client-${node.id}`}
                x1={node.parentX} y1={node.parentY + 20} 
                x2={node.x} y2={node.y - 20} 
                stroke="#334155" strokeWidth="1"
              />
            ))}

            {/* Node: Internet */}
            <g transform={`translate(${internetPos.x}, ${internetPos.y})`}>
              <circle r="35" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
              <text y="5" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">INTERNET</text>
              <path d="M-15 -10 C -15 -20, 15 -20, 15 -10" fill="none" stroke="#94a3b8" strokeWidth="2"/>
              <path d="M-25 0 C -25 -15, 25 -15, 25 0" fill="none" stroke="#94a3b8" strokeWidth="2"/>
            </g>

            {/* Node: Router (CCR) */}
            <g transform={`translate(${routerPos.x}, ${routerPos.y})`}>
              <rect x="-40" y="-30" width="80" height="60" rx="4" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" />
              <text y="-5" textAnchor="middle" fill="#0ea5e9" fontSize="12" fontWeight="bold">CCR2004</text>
              <text y="15" textAnchor="middle" fill="#64748b" fontSize="10">RouterOS</text>
              {/* Status Lights */}
              <circle cx="-30" cy="20" r="2" fill="#22c55e" />
              <circle cx="-22" cy="20" r="2" fill="#22c55e" />
              <circle cx="-14" cy="20" r="2" fill="#22c55e" />
            </g>

            {/* Nodes: Interfaces */}
            {ifaceNodes.map(node => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <rect x="-30" y="-20" width="60" height="40" rx="4" 
                  fill={node.name.includes('wan') ? '#450a0a' : '#1e293b'} 
                  stroke={node.name.includes('wan') ? '#ef4444' : '#94a3b8'} 
                  strokeWidth="2" 
                />
                <text y="-5" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                  {node.name.replace('ether', 'eth').replace('-wan', '').replace('-lan', '')}
                </text>
                
                {/* Traffic Label */}
                <g transform="translate(0, 35)">
                   <rect x="-25" y="-8" width="50" height="16" rx="8" fill="#0f172a" stroke="#334155" />
                   <text y="3" textAnchor="middle" fill="#cbd5e1" fontSize="9">
                     {(node.currentTx + node.currentRx).toFixed(1)} M
                   </text>
                </g>
              </g>
            ))}

            {/* Nodes: Clients */}
            {clientNodes.map(node => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <circle r="18" fill="#1e293b" stroke={node.currentRx > 10 ? '#f59e0b' : '#10b981'} strokeWidth="2" />
                <text y="4" textAnchor="middle" fill="#cbd5e1" fontSize="16">👤</text>
                
                {/* Client Name Label */}
                <text y="32" textAnchor="middle" fill="#94a3b8" fontSize="10">{node.username}</text>
                <text y="44" textAnchor="middle" fill="#64748b" fontSize="9">{node.ipAddress}</text>

                {/* Activity Indicator */}
                {(node.currentTx > 0.1 || node.currentRx > 0.1) && (
                    <circle r="4" cx="12" cy="-12" fill="#10b981" className="animate-pulse" />
                )}
              </g>
            ))}

          </svg>
        </div>
        
        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur p-3 rounded-lg border border-slate-800 text-xs">
           <div className="flex items-center mb-1">
             <span className="w-3 h-3 rounded bg-red-900 border border-red-500 mr-2"></span>
             <span className="text-slate-400">WAN Interface</span>
           </div>
           <div className="flex items-center mb-1">
             <span className="w-3 h-3 rounded bg-slate-800 border border-slate-500 mr-2"></span>
             <span className="text-slate-400">LAN Interface</span>
           </div>
           <div className="flex items-center">
             <span className="w-3 h-3 rounded-full bg-slate-800 border border-emerald-500 mr-2"></span>
             <span className="text-slate-400">PPPoE Client</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTopology;