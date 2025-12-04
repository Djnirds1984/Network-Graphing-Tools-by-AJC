import React, { useState } from 'react';
import { RouterDevice } from '../types';
import { apiService } from '../services/apiService';

interface RouterManagerProps {
  routers: RouterDevice[];
  onAddRouter: (router: RouterDevice) => void;
  onUpdateRouter: (router: RouterDevice) => void;
  onDeleteRouter: (routerId: string) => void;
  tenantId: string;
}

const RouterManager: React.FC<RouterManagerProps> = ({ routers, onAddRouter, onUpdateRouter, onDeleteRouter, tenantId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouterId, setEditingRouterId] = useState<string>('');
  
  // Form State
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('8728'); // Default API port
  const [method, setMethod] = useState<'api' | 'rest'>('api');

  // Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedInfo, setDetectedInfo] = useState<{ model: string, version: string } | null>(null);

  const resetForm = () => {
    setName('');
    setIp('');
    setUsername('admin');
    setPassword('');
    setPort(method === 'api' ? '8728' : '80');
    setTestStatus('idle');
    setDetectedInfo(null);
    setErrorMessage('');
    setIsEditing(false);
    setEditingRouterId('');
  };

  const handleMethodChange = (newMethod: 'api' | 'rest') => {
    setMethod(newMethod);
    if (newMethod === 'api' && (port === '80' || port === '443')) setPort('8728');
    if (newMethod === 'rest' && (port === '8728' || port === '8729')) setPort('80');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setErrorMessage('');
    
    try {
      const info = await apiService.testConnection({ ip, port, username, password, method });
      setDetectedInfo(info);
      setTestStatus('success');
    } catch (err: any) {
      setTestStatus('error');
      setErrorMessage(err.message || 'Connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!detectedInfo || testStatus !== 'success') return;

    const newRouter: RouterDevice = {
      id: `r-${Date.now()}`,
      tenantId: tenantId,
      name: name || detectedInfo.model,
      ip: ip,
      model: detectedInfo.model,
      version: detectedInfo.version,
      isOnline: true,
      username,
      password,
      port,
      method
    };

    onAddRouter(newRouter);
    setIsModalOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    const updated: RouterDevice = {
      id: editingRouterId,
      tenantId: tenantId,
      name: name,
      ip: ip,
      model: detectedInfo?.model || 'Unknown',
      version: detectedInfo?.version || 'ROS',
      isOnline: true,
      username,
      password,
      port,
      method
    };
    onUpdateRouter(updated);
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Router Management</h2>
          <p className="text-slate-400 text-sm">Manage MikroTik devices connected to this tenant.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsEditing(false); setIsModalOpen(true); }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-cyan-900/20 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Router
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
              <tr>
                <th className="px-6 py-3">Router Name</th>
                <th className="px-6 py-3">IP Address</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">RouterOS</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.map(router => (
                <tr key={router.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-slate-200">{router.name}</td>
                  <td className="px-6 py-4 font-mono">{router.ip}</td>
                  <td className="px-6 py-4">{router.model}</td>
                  <td className="px-6 py-4">{router.version}</td>
                  <td className="px-6 py-4 text-center">
                    {router.isOnline ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-900/50">
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/50">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                      onClick={() => {
                        const r = router;
                        setIsEditing(true);
                        setEditingRouterId(r.id);
                        setName(r.name);
                        setIp(r.ip);
                        setUsername(r.username || 'admin');
                        setPassword(r.password || '');
                        setPort(r.port || (r.method === 'rest' ? '80' : '8728'));
                        setMethod(r.method);
                        setIsModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      Configure
                    </button>
                    <button onClick={() => onDeleteRouter(router.id)} className="text-red-400 hover:text-red-300 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {routers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-600">
                    No routers configured. Add your first device to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Router Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200">Connect New Router</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Method Selection */}
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                  onClick={() => handleMethodChange('api')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${method === 'api' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  API (Port 8728)
                </button>
                <button 
                  onClick={() => handleMethodChange('rest')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${method === 'rest' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  REST (Port 80/443)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Friendly Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-cyan-500 outline-none" placeholder="e.g. Office Gateway" />
                 </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IP Address / Host</label>
                    <input type="text" value={ip} onChange={e => setIp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-cyan-500 outline-none" placeholder="192.168.88.1" />
                 </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port</label>
                    <input type="text" value={port} onChange={e => setPort(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-cyan-500 outline-none" />
                 </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-cyan-500 outline-none" />
                 </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-cyan-500 outline-none" />
                 </div>
              </div>

              {/* Status & Feedback */}
              {isTesting && (
                <div className="flex items-center justify-center p-4 text-slate-400 text-sm animate-pulse">
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Connecting to RouterOS...
                </div>
              )}

              {testStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start">
                   <svg className="w-4 h-4 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {errorMessage}
                </div>
              )}

              {testStatus === 'success' && detectedInfo && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
                   <div className="flex items-center font-bold mb-1">
                     <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                     Connection Successful!
                   </div>
                   <div className="text-emerald-300/80 text-xs pl-6">
                     Detected: {detectedInfo.model} <br/>
                     Version: {detectedInfo.version}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end space-x-3">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-sm"
               >
                 Cancel
               </button>
               {!isEditing ? (
                 testStatus !== 'success' ? (
                   <button 
                     onClick={handleTestConnection}
                     disabled={isTesting || !ip}
                     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                   >
                     Test Connection
                   </button>
                 ) : (
                   <button 
                     onClick={handleSave}
                     className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
                   >
                     Save & Connect
                   </button>
                 )
               ) : (
                 <button 
                   onClick={handleUpdate}
                   className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
                 >
                   Save Changes
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouterManager;