const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Overview
  getOverview: () => fetchJson(`${API_URL}/api/overview`),
  
  // Coins
  getTopGainers: (count = 20) => fetchJson(`${API_URL}/api/coins/gainers?count=${count}`),
  getTopVolume: (count = 20) => fetchJson(`${API_URL}/api/coins/volume?count=${count}`),
  getMostValuable: (count = 20) => fetchJson(`${API_URL}/api/coins/valuable?count=${count}`),
  getNewCoins: (count = 20) => fetchJson(`${API_URL}/api/coins/new?count=${count}`),
  getActiveCoins: (count = 20) => fetchJson(`${API_URL}/api/coins/active?count=${count}`),
  getCoin: (address) => fetchJson(`${API_URL}/api/coins/${address}`),
  getCoinSwaps: (address, count = 50) => fetchJson(`${API_URL}/api/coins/${address}/swaps?count=${count}`),
  
  // Topics
  getTopics: () => fetchJson(`${API_URL}/api/topics`),
  
  // Creators
  getCreators: (count = 50) => fetchJson(`${API_URL}/api/creators?count=${count}`),
  
  // Traders & Whales
  getTraders: (count = 50) => fetchJson(`${API_URL}/api/traders?count=${count}`),
  getWhales: (minUsd = 1000) => fetchJson(`${API_URL}/api/whales?min_usd=${minUsd}`),
  
  // Profile
  getProfile: (id) => fetchJson(`${API_URL}/api/profile/${id}`),
  
  // WebSocket URL for whale alerts
  getWhaleWsUrl: () => {
    const wsBase = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsBase}/ws/whales`;
  },
};
