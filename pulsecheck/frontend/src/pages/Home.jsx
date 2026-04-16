import { useState, useEffect } from 'react'
import { Search, TrendingUp, Zap, BarChart2, Globe } from 'lucide-react'
import axios from 'axios'
import './Home.css'

const SUGGESTIONS = [
  'Jio 5G network quality',
  'ChatGPT vs Google Gemini',
  'Zomato food delivery',
  'Paytm after RBI ban',
  'NEET exam controversy',
  'iPhone 16 India review',
  'Bengaluru traffic',
  'UPI payment issues'
]

const USE_CASES = [
  { icon: '🏛️', label: 'Policy Reaction', desc: 'Gauge public response to govt policies' },
  { icon: '📦', label: 'Product Sentiment', desc: 'Is your product loved or hated?' },
  { icon: '🎬', label: 'Movie Buzz', desc: 'Real audience reactions before you watch' },
  { icon: '📈', label: 'Brand Health', desc: 'Track brand reputation in real time' },
  { icon: '🗳️', label: 'Political Pulse', desc: 'Pre-election sentiment analysis' },
  { icon: '🌆', label: 'Local Trends', desc: 'What\'s trending in your city' },
]

export default function Home({ onSearch }) {
  const [input, setInput] = useState('')
  const [trending, setTrending] = useState(null)
  const [loadingTrend, setLoadingTrend] = useState(true)

  useEffect(() => {
    axios.get('${import.meta.env.VITE_API_URL}/api/trending')
      .then(r => setTrending(r.data))
      .catch(() => {})
      .finally(() => setLoadingTrend(false))
  }, [])

  function submit(q) {
    const query = (q || input).trim()
    if (query.length > 1) onSearch(query)
  }

  return (
    <div className="home">
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge"><Zap size={13} /> Real-time sentiment</div>
        <h1 className="hero-title">
          What does the<br />
          <span className="accent-text">internet think?</span>
        </h1>
        <p className="hero-sub">Search any topic, brand, policy, or person. Get unbiased public sentiment from Reddit, News, and more — powered by AI.</p>

        <div className="search-wrap hero-search">
          <input
            className="search-input"
            placeholder="Try: Jio network quality, NEET controversy, iPhone 16..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
          <button className="search-btn" onClick={() => submit()}>
            <Search size={16} />
          </button>
        </div>

        <div className="suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => submit(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="section">
        <div className="section-header">
          <BarChart2 size={16} className="section-icon" />
          <span>Who uses PulseCheck</span>
        </div>
        <div className="usecase-grid">
          {USE_CASES.map(u => (
            <div key={u.label} className="usecase-card" onClick={() => submit(u.label)}>
              <span className="usecase-icon">{u.icon}</span>
              <div>
                <div className="usecase-label">{u.label}</div>
                <div className="usecase-desc">{u.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="section">
        <div className="section-header">
          <TrendingUp size={16} className="section-icon" />
          <span>Trending in India right now</span>
        </div>

        {loadingTrend && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner" />
          </div>
        )}

        {trending && (
          <div className="trending-layout">
            {/* Google Trends */}
            <div className="trend-col">
              <div className="trend-col-header"><Globe size={13} /> Google Trends</div>
              {(trending.googleTrends || []).map((t, i) => (
                <button key={i} className="trend-item" onClick={() => submit(t.title)}>
                  <span className="trend-rank">{i + 1}</span>
                  <span className="trend-title">{t.title}</span>
                  {t.traffic && <span className="trend-traffic">{t.traffic}</span>}
                </button>
              ))}
            </div>

            {/* News */}
            <div className="trend-col wide">
              <div className="trend-col-header"><Zap size={13} /> Latest News</div>
              {(trending.news || []).slice(0, 8).map((n, i) => (
                <div key={i} className="news-item">
                  <div className="news-source">{n.feedSource}</div>
                  <button className="news-title" onClick={() => submit(n.title)}>{n.title}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}