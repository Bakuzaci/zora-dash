import { useState, useEffect, useRef } from 'react'
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
    }} role="banner">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }} aria-hidden="true">◎</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ZORA</h1>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Dashboard</span>
        </div>
        <a 
          href="https://zora.co" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn"
          aria-label="Open Zora website in new tab"
        >
          Open Zora <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  )
}

function StatsBar({ stats }) {
  return (
    <section aria-label="Key statistics" className="grid-4" style={{ marginBottom: 24 }}>
      <article className="card card-body">
        <p className="stat-label" id="vol-label">Top 10 Volume (24h)</p>
        <p className="stat-value" aria-labelledby="vol-label">{formatNumber(stats?.total_volume_24h)}</p>
      </article>
      <article className="card card-body">
        <p className="stat-label" id="mcap-label">Top 10 Market Cap</p>
        <p className="stat-value" aria-labelledby="mcap-label">{formatNumber(stats?.top_coins_mcap)}</p>
      </article>
      <article className="card card-body">
        <p className="stat-label" id="chain-label">Chain</p>
        <p className="stat-value" style={{ fontSize: 20 }} aria-labelledby="chain-label">Base</p>
      </article>
      <article className="card card-body">
        <p className="stat-label" id="source-label">Data Source</p>
        <p className="stat-value" style={{ fontSize: 20 }} aria-labelledby="source-label">Zora SDK</p>
      </article>
    </section>
  )
}

function CoinRow({ coin, rank }) {
  const change = coin.market_cap_delta_24h
  const isPositive = change && change > 0
  
  return (
    <tr>
      <td><span className="rank" aria-label={`Rank ${rank}`}>{rank}</span></td>
      <td>
        <div className="coin-row">
          {coin.image ? (
            <img src={coin.image} alt={`${coin.name} logo`} className="avatar" loading="lazy" />
          ) : (
            <div className="avatar" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} role="img" aria-label={`${coin.name} placeholder`}>
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
      <td className="text-secondary">{coin.unique_holders?.toLocaleString() || '—'}</td>
      <td>
        {coin.creator_handle ? (
          <span className="text-secondary">@{coin.creator_handle}</span>
        ) : (
          <span className="text-muted" title={coin.creator_address}>{coin.creator_address?.slice(0, 6)}…</span>
        )}
      </td>
      <td className="text-muted">{timeAgo(coin.created_at)}</td>
    </tr>
  )
}

function CoinsTable({ coins, title }) {
  if (!coins || coins.length === 0) {
    return <div className="loading" role="status">No data available</div>
  }
  
  return (
    <section className="card" style={{ overflow: 'hidden' }} aria-label={title || 'Coins table'}>
      {title && (
        <div className="card-header">
          <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>{title}</h2>
          <span className="text-muted" aria-live="polite">{coins.length} coins</span>
        </div>
      )}
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
        <table role="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Coin</th>
              <th scope="col">Market Cap</th>
              <th scope="col">Volume 24h</th>
              <th scope="col">24h Change</th>
              <th scope="col">Holders</th>
              <th scope="col">Creator</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin, i) => (
              <CoinRow key={coin.address || i} coin={coin} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TradersTable({ traders }) {
  if (!traders || traders.length === 0) {
    return <div className="loading" role="status">No data available</div>
  }
  
  return (
    <section className="card" style={{ overflow: 'hidden' }} aria-label="Trader leaderboard">
      <div className="card-header">
        <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
          <span aria-hidden="true">🏆</span> Top Traders This Week
        </h2>
        <span className="text-muted" aria-live="polite">{traders.length} traders</span>
      </div>
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
        <table role="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Trader</th>
              <th scope="col">Score</th>
              <th scope="col">Volume</th>
              <th scope="col">Trades</th>
            </tr>
          </thead>
          <tbody>
            {traders.map((trader, i) => (
              <tr key={trader.handle || i}>
                <td><span className="rank">{i + 1}</span></td>
                <td style={{ fontWeight: 500 }}>@{trader.handle || 'anon'}</td>
                <td className="font-mono">{trader.score?.toLocaleString()}</td>
                <td className="font-mono">{formatNumber(trader.volume_usd)}</td>
                <td className="font-mono text-secondary">{trader.trades_count?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ============================================================================
// Topics/Categories View
// ============================================================================

function TopicsView({ topics }) {
  if (!topics || topics.length === 0) {
    return <div className="loading" role="status">No topics available</div>
  }

  return (
    <div className="grid-2">
      {topics.map((topic) => (
        <section key={topic.topic} className="card" aria-label={`${topic.topic} category`}>
          <div className="card-header">
            <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
              {topic.topic}
            </h2>
            <span className="text-muted">{topic.coin_count} coins</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div>
                <p className="stat-label">Volume 24h</p>
                <p className="font-mono" style={{ fontSize: 18, fontWeight: 600 }}>
                  {formatNumber(topic.total_volume_24h)}
                </p>
              </div>
              <div>
                <p className="stat-label">Market Cap</p>
                <p className="font-mono" style={{ fontSize: 18, fontWeight: 600 }}>
                  {formatNumber(topic.total_market_cap)}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topic.top_coins?.slice(0, 5).map((coin, i) => (
                <div key={coin.address} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span className="rank">{i + 1}</span>
                  {coin.image ? (
                    <img src={coin.image} alt="" className="avatar-sm" loading="lazy" />
                  ) : (
                    <div className="avatar-sm" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                      {coin.symbol?.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coin.name}</div>
                  </div>
                  <span className="font-mono text-secondary">{formatNumber(coin.volume_24h)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

// ============================================================================
// Creators/Earnings View
// ============================================================================

function CreatorsTable({ creators }) {
  if (!creators || creators.length === 0) {
    return <div className="loading" role="status">No data available</div>
  }
  
  return (
    <section className="card" style={{ overflow: 'hidden' }} aria-label="Top creators by earnings">
      <div className="card-header">
        <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
          <span aria-hidden="true">💰</span> Top Creators by Earnings
        </h2>
        <span className="text-muted" aria-live="polite">{creators.length} creators</span>
      </div>
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
        <table role="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Creator</th>
              <th scope="col">Est. Earnings</th>
              <th scope="col">Total Volume</th>
              <th scope="col">Vol 24h</th>
              <th scope="col">Market Cap</th>
              <th scope="col">Holders</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((creator, i) => (
              <tr key={creator.address || i}>
                <td><span className="rank">{i + 1}</span></td>
                <td>
                  <div className="coin-row">
                    {creator.avatar ? (
                      <img src={creator.avatar} alt="" className="avatar" loading="lazy" />
                    ) : (
                      <div className="avatar" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        {creator.handle?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="coin-info">
                      <div className="coin-name">@{creator.handle || 'anon'}</div>
                      {creator.twitter && <div className="coin-symbol">@{creator.twitter}</div>}
                    </div>
                  </div>
                </td>
                <td className="font-mono text-green" style={{ fontWeight: 600 }}>
                  {formatNumber(creator.estimated_earnings)}
                </td>
                <td className="font-mono">{formatNumber(creator.total_volume)}</td>
                <td className="font-mono text-secondary">{formatNumber(creator.volume_24h)}</td>
                <td className="font-mono text-secondary">{formatNumber(creator.market_cap)}</td>
                <td className="text-secondary">{creator.unique_holders?.toLocaleString() || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ============================================================================
// Whale Alerts View
// ============================================================================

function WhalesView({ whales, liveAlerts }) {
  const allWhales = [...liveAlerts, ...(whales || [])].slice(0, 50)
  
  if (allWhales.length === 0) {
    return <div className="loading" role="status">No whale trades found</div>
  }
  
  return (
    <section className="card" style={{ overflow: 'hidden' }} aria-label="Whale trades">
      <div className="card-header">
        <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
          <span aria-hidden="true">🐋</span> Whale Alerts
          {liveAlerts.length > 0 && (
            <span style={{ 
              marginLeft: 12, 
              padding: '2px 8px', 
              background: 'var(--green)', 
              color: 'white', 
              borderRadius: 4, 
              fontSize: 11, 
              fontWeight: 500 
            }}>
              LIVE
            </span>
          )}
        </h2>
        <span className="text-muted">Trades ≥ $1,000</span>
      </div>
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
        <table role="table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Coin</th>
              <th scope="col">Amount</th>
              <th scope="col">Trader</th>
              <th scope="col">Time</th>
              <th scope="col">Tx</th>
            </tr>
          </thead>
          <tbody>
            {allWhales.map((whale, i) => {
              const isBuy = whale.type === 'BUY'
              const isNew = liveAlerts.includes(whale)
              return (
                <tr key={whale.tx_hash || i} style={isNew ? { background: 'var(--green-bg)' } : {}}>
                  <td>
                    <span 
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 12, 
                        fontWeight: 600,
                        background: isBuy ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: isBuy ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {whale.type}
                    </span>
                  </td>
                  <td>
                    <div className="coin-row">
                      {whale.coin?.image && (
                        <img src={whale.coin.image} alt="" className="avatar-sm" loading="lazy" />
                      )}
                      <span className="coin-name">{whale.coin?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>
                    {formatNumber(whale.amount_usd)}
                  </td>
                  <td className="text-secondary">
                    {whale.trader_handle ? `@${whale.trader_handle}` : whale.trader_address?.slice(0, 8) + '…'}
                  </td>
                  <td className="text-muted">{timeAgo(whale.timestamp)}</td>
                  <td>
                    {whale.tx_hash && (
                      <a 
                        href={`https://basescan.org/tx/${whale.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ padding: '4px 8px', minHeight: 'auto', fontSize: 11 }}
                        aria-label="View transaction on Basescan"
                      >
                        View <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ============================================================================
// Tab Navigation (Accessible)
// ============================================================================

const TABS = [
  { id: 'overview', label: 'Overview', icon: null },
  { id: 'topics', label: 'Topics', icon: '📁' },
  { id: 'gainers', label: 'Top Gainers', icon: '🚀' },
  { id: 'volume', label: 'Top Volume', icon: '📊' },
  { id: 'valuable', label: 'Most Valuable', icon: '💎' },
  { id: 'new', label: 'New Coins', icon: '🆕' },
  { id: 'creators', label: 'Creators', icon: '💰' },
  { id: 'traders', label: 'Traders', icon: '🏆' },
  { id: 'whales', label: 'Whales', icon: '🐋' },
]

function TabNav({ activeTab, onChange }) {
  const handleKeyDown = (e, tabId) => {
    const currentIndex = TABS.findIndex(t => t.id === tabId)
    let newIndex = currentIndex
    
    if (e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % TABS.length
    } else if (e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      newIndex = 0
    } else if (e.key === 'End') {
      newIndex = TABS.length - 1
    } else {
      return
    }
    
    e.preventDefault()
    onChange(TABS[newIndex].id)
  }

  return (
    <nav aria-label="Dashboard sections" style={{ marginBottom: 24 }}>
      <div className="nav-tabs" role="tablist" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>} {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

// ============================================================================
// Overview Mini Tables
// ============================================================================

function OverviewSection({ data }) {
  return (
    <>
      <StatsBar stats={data.overview?.stats} />
      
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <section className="card" aria-label="Top gainers today">
          <div className="card-header">
            <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
              <span aria-hidden="true">🚀</span> Top Gainers (24h)
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
            <table role="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Coin</th>
                  <th scope="col">MCap</th>
                  <th scope="col">24h Change</th>
                </tr>
              </thead>
              <tbody>
                {data.overview?.top_gainers?.map((coin, i) => (
                  <tr key={coin.address}>
                    <td><span className="rank">{i + 1}</span></td>
                    <td>
                      <div className="coin-row">
                        {coin.image && <img src={coin.image} alt="" className="avatar-sm" loading="lazy" />}
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
        </section>
        
        <section className="card" aria-label="Top volume today">
          <div className="card-header">
            <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
              <span aria-hidden="true">📊</span> Top Volume (24h)
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
            <table role="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Coin</th>
                  <th scope="col">Volume</th>
                  <th scope="col">MCap</th>
                </tr>
              </thead>
              <tbody>
                {data.overview?.top_volume?.map((coin, i) => (
                  <tr key={coin.address}>
                    <td><span className="rank">{i + 1}</span></td>
                    <td>
                      <div className="coin-row">
                        {coin.image && <img src={coin.image} alt="" className="avatar-sm" loading="lazy" />}
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
        </section>
      </div>
      
      <div className="grid-2">
        <section className="card" aria-label="Most valuable coins">
          <div className="card-header">
            <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
              <span aria-hidden="true">💎</span> Most Valuable
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
            <table role="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Coin</th>
                  <th scope="col">MCap</th>
                  <th scope="col">Holders</th>
                </tr>
              </thead>
              <tbody>
                {data.overview?.most_valuable?.map((coin, i) => (
                  <tr key={coin.address}>
                    <td><span className="rank">{i + 1}</span></td>
                    <td>
                      <div className="coin-row">
                        {coin.image && <img src={coin.image} alt="" className="avatar-sm" loading="lazy" />}
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
        </section>
        
        <section className="card" aria-label="Top traders">
          <div className="card-header">
            <h2 style={{ fontWeight: 600, fontSize: 'inherit', margin: 0 }}>
              <span aria-hidden="true">🏆</span> Top Traders
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable table">
            <table role="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Trader</th>
                  <th scope="col">Score</th>
                  <th scope="col">Volume</th>
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
        </section>
      </div>
    </>
  )
}

// ============================================================================
// Main App
// ============================================================================

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [error, setError] = useState(null)
  const [liveAlerts, setLiveAlerts] = useState([])
  const wsRef = useRef(null)

  // WebSocket for whale alerts
  useEffect(() => {
    if (activeTab === 'whales') {
      try {
        const wsUrl = api.getWhaleWsUrl()
        wsRef.current = new WebSocket(wsUrl)
        
        wsRef.current.onmessage = (event) => {
          const whale = JSON.parse(event.data)
          setLiveAlerts(prev => [whale, ...prev].slice(0, 20))
        }
        
        wsRef.current.onerror = () => {
          console.log('WebSocket not available, using polling')
        }
      } catch (e) {
        console.log('WebSocket connection failed')
      }
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [activeTab])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        if (activeTab === 'overview') {
          const overview = await api.getOverview()
          setData({ overview })
        } else if (activeTab === 'topics') {
          const topics = await api.getTopics()
          setData({ topics })
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
        } else if (activeTab === 'creators') {
          const creators = await api.getCreators(50)
          setData({ creators })
        } else if (activeTab === 'traders') {
          const traders = await api.getTraders(100)
          setData({ traders })
        } else if (activeTab === 'whales') {
          const whales = await api.getWhales(1000)
          setData({ whales })
          setLiveAlerts([])
        }
      } catch (e) {
        console.error('Fetch error:', e)
        setError('Failed to load data. Please try again.')
      }
      setLoading(false)
    }
    fetchData()
  }, [activeTab])

  return (
    <div style={{ minHeight: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      
      <main id="main-content" style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {error ? (
            <div className="card card-body" role="alert" style={{ color: 'var(--red)' }}>
              {error}
            </div>
          ) : loading ? (
            <div className="loading" role="status" aria-live="polite">
              <span className="sr-only">Loading</span>
              Loading…
            </div>
          ) : activeTab === 'overview' ? (
            <OverviewSection data={data} />
          ) : activeTab === 'topics' ? (
            <TopicsView topics={data.topics} />
          ) : activeTab === 'creators' ? (
            <CreatorsTable creators={data.creators} />
          ) : activeTab === 'traders' ? (
            <TradersTable traders={data.traders} />
          ) : activeTab === 'whales' ? (
            <WhalesView whales={data.whales} liveAlerts={liveAlerts} />
          ) : (
            <CoinsTable 
              coins={data.coins} 
              title={TABS.find(t => t.id === activeTab)?.label}
            />
          )}
        </div>
      </main>
      
      <footer style={{ borderTop: '1px solid var(--border)', padding: 24, marginTop: 48 }} role="contentinfo">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 13 }}>
          <span>Data from Zora SDK API</span>
          <span>Built with <span aria-label="Zora">◎</span></span>
        </div>
      </footer>
    </div>
  )
}
