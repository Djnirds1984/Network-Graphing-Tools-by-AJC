import { GoogleGenAI } from "@google/genai";
import { NetworkInterface, PPPoEClient, SystemStats } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables. Gemini features may not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeNetworkHealth = async (
  interfaces: NetworkInterface[],
  clients: PPPoEClient[],
  sysStats: SystemStats
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: API Key missing. Unable to perform AI analysis.";

  // Prepare a concise summary for the prompt
  const activeInterfaces = interfaces
    .filter(i => i.status === 'running')
    .map(i => `${i.name}: Tx ${i.currentTx}Mbps / Rx ${i.currentRx}Mbps`)
    .join(', ');

  const topClients = [...clients]
    .sort((a, b) => b.currentRx - a.currentRx)
    .slice(0, 3)
    .map(c => `${c.username} (${c.currentRx}Mbps Rx)`)
    .join(', ');

  const totalClientRx = clients.reduce((acc, c) => acc + c.currentRx, 0).toFixed(2);
  const totalClientTx = clients.reduce((acc, c) => acc + c.currentTx, 0).toFixed(2);

  const prompt = `
    Act as a Senior Network Engineer. Analyze the following snapshot of a MikroTik router's live statistics.
    
    System Health:
    - CPU Load: ${sysStats.cpuLoad}%
    - RAM Usage: ${sysStats.memoryUsage}%
    
    Interface Traffic (Snapshot):
    - ${activeInterfaces}
    
    PPPoE Clients Overview:
    - Total Clients: ${clients.length}
    - Top Consumers: ${topClients || 'None'}
    - Aggregate Throughput: Tx ${totalClientTx} Mbps / Rx ${totalClientRx} Mbps

    Task:
    Provide a brief, 3-sentence health assessment. Identify any potential bottlenecks (CPU, specific interface saturation, or abusive clients). Use professional networking terminology.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return "Failed to contact AI service for analysis. Please check network connection or API quota.";
  }
};
