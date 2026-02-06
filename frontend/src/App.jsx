import { useState, useEffect } from 'react'
import { api } from './api/client'

// ============================================================================
// Utilities
// ============================================================================

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

function formatChange(n) {
  if (n === null || n === undefined) return '—'
  const sign = n >= 0 ? '+' : ''
  if (Math.abs(n) >= 1e6) return `${sign}$${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `${sign}$${(n / 1e3).toFixed(1)}K`
  return `${sign}$${n.toFixed(0)}`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ============================================================================
// Components
// ============================================================================

function Header() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '16px 0',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>◎</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>ZORA</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Dashboard</span>
        </div>
        <a href="https://zora.co" target="_blank" rel="noopener" className="btn">
          Open Zora ↗
        </a>
      </div>
    </header>
  )
}

function StatsBar({ stats }) {
  return (
    <div className="grid-4" style={{ marginBottom: 24 }}>
      <div className="card card-body">
        <div className="stat-label">Top 10 Volume (24h)</div>
        <div className="stat-value">{formatNumber(stats?.total_volume_24h)}</div>
      </div>
      <div className="card card-body">
        <div className="stat-label">Top 10 Market Cap</div>
        <div className="stat-value">{formatNumber(stats?.top_coins_mcap)}</div>
      </div>
      <div className="card card-body">
        <div className="stat-label">Chain</div>
        <div className="stat-value" style={{ fontSize: 20 }}>Base</div>
      </div>
      <div className="card card-body">
        <div className="stat-label">Data Source</div>
        <div className="stat-value" style={{ fontSize: 20 }}>Zora SDK</div>
      </div>
    </div>
  )
}

function CoinRow({ coin, rank }) {
  const change = coin.market_cap_delta_24h
  const isPositive = change && change > 0
  
  return (
    <tr>
      <td><span className="rank">{rank}</span></td>
      <td>
        <div className="coin-row">
          {coin.image ? (
            <img src={coin.image} alt="" className="avatar" />
          ) : (
            <div className="avatar" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              {coin.symbol?.charAt(0)}
            </div>
          )}
          <div className="coin-info">
            <div className="coin-name">{coin.name}</div>
            <div className="coin-symbol">{coin.symbol}</div>
          </div>
        </div>
      </td>
      <td className="font-mono">{formatNumber(coin.market_cap)}</td>
      <td className="font-mono text-secondary">{formatNumber(coin.volume_24h)}</td>
      <td>
        <span className={`change ${isPositive ? 'positive' : 'negative'}`}>
          {formatChange(change)}
        </span>
      </td>
      <td className="text-secondary">{coin.unique_holders || '—'}</td>
      <td>
        {coin.creator_handle ? (
          <span className="text-secondary">@{coin.creator_handle}</span>
        ) : (
          <span className="text-muted">{coin.creator_address?.slice(0, 6)}...</span>
        )}
      </td>
      <td className="text-muted">{timeAgo(coin.created_at)}</td>
    </tr>
  )
}

function CoinsTable({ coins, title }) {
  if (!coins || coins.length === 0) {
    return <div className="loading">No data</div>
  }
  
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {title && (
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span className="text-muted">{coins.length} coins</span>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Coin</th>
              <th>Market Cap</th>
              <th>Volume 24h</th>
              <th>24h Δ</th>
              <th>Holders</th>
              <th>Creator</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin, i) => (
              <CoinRow key={coin.address || i} coin={coin} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TraderRow({ trader, rank }) {
  return (
    <tr>
      <td><span className="rank">{rank}</span></td>
      <td>
        <span style={{ fontWeight: 500 }}>@{trader.handle || 'anon'}</span>
      </td>
      <td className="font-mono">{trader.score?.toLocaleString()}</td>
      <td className="font-mono">{formatNumber(trader.volume_usd)}</td>
      <td className="font-mono text-secondary">{trader.trades_count?.toLocaleString()}</td>
    </tr>
  )
}

function TradersTable({ traders }) {
  if (!traders || traders.length === 0) {
    return <div className="loading">No data</div>
  }
  
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <span style={{ fontWeight: 600 }}>🏆 Top Traders This Week</span>
        <span className="text-muted">{traders.length} traders</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Trader</th>
              <th>Score</th>
              <th>Volume</th>
              <th>Trades</th>
            </tr>
          </thead>
          <tbody>
            {traders.map((trader, i) => (
              <TraderRow key={trader.handle || i} trader={trader} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Main App
// ============================================================================

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'gainers', label: '🚀 Top Gainers' },
  { id: 'volume', label: '📊 Top Volume' },
  { id: 'valuable', label: '💎 Most Valuable' },
  { id: 'new', label: '🆕 New Coins' },
  { id: 'traders', label: '🏆 Traders' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        if (activeTab === 'overview') {
          const overview = await api.getOverview()
          setData({ overview })
        } else if (activeTab === 'gainers') {
          const coins = await api.getTopGainers(50)
          setData({ coins })
        } else if (activeTab === 'volume') {
          const coins = await api.getTopVolume(50)
          setData({ coins })
        } else if (activeTab === 'valuable') {
          const coins = await api.getMostValuable(50)
          setData({ coins })
        } else if (activeTab === 'new') {
          const coins = await api.getNewCoins(50)
          setData({ coins })
        } else if (activeTab === 'traders') {
          const traders = await api.getTraders(100)
          setData({ traders })
        }
      } catch (e) {
        console.error('Fetch error:', e)
      }
      setLoading(false)
    }
    fetchData()
  }, [activeTab])

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Navigation */}
        <div className="nav-tabs" style={{ marginBottom: 24, width: 'fit-content' }}>
          {TABS.map(tab => (
            <div
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : activeTab === 'overview' ? (
          <>
            <StatsBar stats={data.overview?.stats} />
            
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>🚀 Top Gainers (24h)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Coin</th>
                        <th>MCap</th>
                        <th>24h Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.overview?.top_gainers?.map((coin, i) => (
                        <tr key={coin.address}>
                          <td><span className="rank">{i + 1}</span></td>
                          <td>
                            <div className="coin-row">
                              {coin.image && <img src={coin.image} alt="" className="avatar-sm" />}
                              <span className="coin-name">{coin.name}</span>
                            </div>
                          </td>
                          <td className="font-mono">{formatNumber(coin.market_cap)}</td>
                          <td className="change positive">{formatChange(coin.market_cap_delta_24h)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>📊 Top Volume (24h)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Coin</th>
                        <th>Volume</th>
                        <th>MCap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.overview?.top_volume?.map((coin, i) => (
                        <tr key={coin.address}>
                          <td><span className="rank">{i + 1}</span></td>
                          <td>
                            <div className="coin-row">
                              {coin.image && <img src={coin.image} alt="" className="avatar-sm" />}
                              <span className="coin-name">{coin.name}</span>
                            </div>
                          </td>
                          <td className="font-mono">{formatNumber(coin.volume_24h)}</td>
                          <td className="font-mono text-secondary">{formatNumber(coin.market_cap)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>💎 Most Valuable</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Coin</th>
                        <th>MCap</th>
                        <th>Holders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.overview?.most_valuable?.map((coin, i) => (
                        <tr key={coin.address}>
                          <td><span className="rank">{i + 1}</span></td>
                          <td>
                            <div className="coin-row">
                              {coin.image && <img src={coin.image} alt="" className="avatar-sm" />}
                              <span className="coin-name">{coin.name}</span>
                            </div>
                          </td>
                          <td className="font-mono">{formatNumber(coin.market_cap)}</td>
                          <td className="text-secondary">{coin.unique_holders?.toLocaleString() || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>🏆 Top Traders</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Trader</th>
                        <th>Score</th>
                        <th>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.overview?.top_traders?.map((trader, i) => (
                        <tr key={trader.handle || i}>
                          <td><span className="rank">{i + 1}</span></td>
                          <td style={{ fontWeight: 500 }}>@{trader.handle || 'anon'}</td>
                          <td className="font-mono">{trader.score?.toLocaleString()}</td>
                          <td className="font-mono text-secondary">{formatNumber(trader.volume_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'traders' ? (
          <TradersTable traders={data.traders} />
        ) : (
          <CoinsTable 
            coins={data.coins} 
            title={TABS.find(t => t.id === activeTab)?.label}
          />
        )}
      </main>
      
      <footer style={{ borderTop: '1px solid var(--border)', padding: 24, marginTop: 48 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 13 }}>
          <span>Data from Zora SDK API</span>
          <span>Built with ◎</span>
        </div>
      </footer>
    </div>
  )
}
