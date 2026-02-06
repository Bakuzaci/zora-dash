const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => fetchJson(`${API_URL}/api/overview`),
  getTopGainers: (count = 20) => fetchJson(`${API_URL}/api/coins/gainers?count=${count}`),
  getTopVolume: (count = 20) => fetchJson(`${API_URL}/api/coins/volume?count=${count}`),
  getMostValuable: (count = 20) => fetchJson(`${API_URL}/api/coins/valuable?count=${count}`),
  getNewCoins: (count = 20) => fetchJson(`${API_URL}/api/coins/new?count=${count}`),
  getActiveCoins: (count = 20) => fetchJson(`${API_URL}/api/coins/active?count=${count}`),
  getCoin: (address) => fetchJson(`${API_URL}/api/coins/${address}`),
  getTraders: (count = 50) => fetchJson(`${API_URL}/api/traders?count=${count}`),
  getCreators: (count = 20) => fetchJson(`${API_URL}/api/creators?count=${count}`),
  getProfile: (id) => fetchJson(`${API_URL}/api/profile/${id}`),
};
