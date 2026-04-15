import { useState, useEffect } from 'react'
import { ArrowLeft, Search, ExternalLink, ThumbsUp, ThumbsDown, MessageCircle, TrendingUp, Newspaper, Flame } from 'lucide-react'
import axios from 'axios'
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import './Results.css'

const SENTIMENT_COLOR = { Positive: '#22c55e', Negative: '#ef4444', Mixed: '#f59e0b', Neutral: '#818cf8' }

export default function Results({ query, onBack, onSearch }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [input, setInput] = useState(query)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)
    setInput(query)
    axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to fetch. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [query])

  function submit() {
    if (input.trim().length > 1) onSearch(input.trim())
  }

  const score = data?.summary?.sentimentScore || 0
  const sentiment = data?.summary?.sentiment || 'Neutral'
  const sColor = SENTIMENT_COLOR[sentiment] || '#818cf8'

  const pieData = data ? Object.entries(data.sourceCounts || {}).map(([name, value]) => ({ name, value })) : []
  const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa']

  return (
    <div className="results-page">
      {/* Top bar */}
      <div className="results-topbar">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /></button>
        <div className="search-wrap topbar-search">
          <input
            className="search-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button className="search-btn" onClick={submit}><Search size={14} /></button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Scanning Reddit, News, HackerNews...</p>
          <p className="loading-sub">Pulling data from multiple sources</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <div className="error-title">Something went wrong</div>
          <div className="error-msg">{error}</div>
          <div className="error-hint">Make sure backend is running: <code>node server.js</code> in the backend folder</div>
        </div>
      )}

      {data && (
        <div className="results-body fade-in">
          {/* Query title */}
          <div className="query-header">
            <h1 className="query-title">"{query}"</h1>
            <div className="query-meta">
              <span className={`tag ${sentiment.toLowerCase()}`}>{sentiment}</span>
              <span className="tag">{data.totalDataPoints} data points</span>
              {data.cached && <span className="tag">Cached</span>}
            </div>
          </div>

          {/* Wikipedia context */}
          {data.wikiSummary && (
            <div className="wiki-box">
              <div className="wiki-label">Context</div>
              <p>{data.wikiSummary.slice(0, 300)}{data.wikiSummary.length > 300 ? '...' : ''}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {['overview', 'posts', 'comments', 'news'].map(t => (
              <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              {/* Sentiment meter + chart */}
              <div className="overview-top">
                <div className="card sentiment-card">
                  <div className="sentiment-score-wrap">
                    <div className="sentiment-circle" style={{ '--score-color': sColor }}>
                      <span className="score-num" style={{ color: sColor }}>{score}</span>
                      <span className="score-label">/ 100</span>
                    </div>
                    <div className="sentiment-info">
                      <div className="sentiment-name" style={{ color: sColor }}>{sentiment}</div>
                      <div className="sentiment-desc">Public Sentiment Score</div>
                      <div className="score-bar" style={{ marginTop: 12 }}>
                        <div className="score-fill" style={{ width: `${score}%`, background: sColor }} />
                      </div>
                    </div>
                  </div>
                  <div className="trending-opinion">
                    <div className="to-label">Trending Opinion</div>
                    <p>{data.summary.trendingOpinion}</p>
                  </div>
                </div>

                <div className="card source-chart-card">
                  <div className="card-title">Data Sources</div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div style={{ padding: '20px', color: 'var(--text3)' }}>No source data</div>}
                  <div className="source-legend">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="legend-item">
                        <span className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key themes */}
              <div className="card">
                <div className="card-title">Key Themes People Discuss</div>
                <div className="themes-grid">
                  {(data.summary.keyThemes || []).map((t, i) => (
                    <div key={i} className="theme-chip" onClick={() => onSearch(t)}>
                      <span className="theme-num">{i + 1}</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Love vs Criticize */}
              <div className="two-col">
                <div className="card">
                  <div className="card-title positive-title"><ThumbsUp size={14} /> What people love</div>
                  <ul className="point-list">
                    {(data.summary.whatPeopleLove || []).map((p, i) => (
                      <li key={i} className="point positive">{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <div className="card-title negative-title"><ThumbsDown size={14} /> What people criticize</div>
                  <ul className="point-list">
                    {(data.summary.whatPeopleCriticize || []).map((p, i) => (
                      <li key={i} className="point negative">{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Verdict */}
              <div className="card verdict-card">
                <div className="card-title">AI Verdict</div>
                <p className="verdict-text">{data.summary.verdict}</p>
              </div>

              {/* HackerNews */}
              {(data.hackerNews || []).length > 0 && (
                <div className="card">
                  <div className="card-title"><Flame size={14} style={{ color: 'var(--orange)' }} /> HackerNews Discussion</div>
                  {data.hackerNews.map((h, i) => (
                    <div key={i} className="hn-item">
                      <a href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
                      <span className="hn-meta">{h.score} pts · {h.comments} comments</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>Top Reddit Posts</div>
              {(data.topPosts || []).length === 0 && <div className="empty-state">No posts found for this query.</div>}
              {(data.topPosts || []).map((p, i) => (
                <div key={i} className="card post-card">
                  <div className="post-meta">
                    <span className="tag">r/{p.subreddit}</span>
                    <span className="post-time">{new Date(p.created).toLocaleDateString()}</span>
                  </div>
                  <div className="post-title">{p.title}</div>
                  {p.text && <p className="post-text">{p.text.slice(0, 200)}{p.text.length > 200 ? '...' : ''}</p>}
                  <div className="post-footer">
                    <span className="post-stat"><ThumbsUp size={12} /> {p.score?.toLocaleString()}</span>
                    <span className="post-stat"><MessageCircle size={12} /> {p.comments}</span>
                    {p.upvoteRatio && <span className="post-stat">{Math.round(p.upvoteRatio * 100)}% upvoted</span>}
                    <a href={p.url} target="_blank" rel="noreferrer" className="post-link"><ExternalLink size={12} /> View</a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>Top Comments from Reddit</div>
              {(data.topComments || []).length === 0 && <div className="empty-state">No comments found.</div>}
              {(data.topComments || []).map((c, i) => (
                <div key={i} className="card comment-card">
                  <div className="comment-header">
                    <span className="tag">r/{c.subreddit}</span>
                    <span className="comment-score"><ThumbsUp size={11} /> {c.score}</span>
                  </div>
                  <p className="comment-text">"{c.text}"</p>
                  <div className="comment-post">re: {c.postTitle?.slice(0, 80)}</div>
                </div>
              ))}
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>News Coverage</div>
              {(data.recentNews || []).length === 0 && <div className="empty-state">No news found for this query.</div>}
              {(data.recentNews || []).map((n, i) => (
                <div key={i} className="card news-card">
                  <div className="news-meta">
                    <span className="tag">{n.feedSource}</span>
                    <span className="post-time">{n.created ? new Date(n.created).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="post-title">{n.title}</div>
                  {n.text && <p className="post-text">{n.text}</p>}
                  {n.url && <a href={n.url} target="_blank" rel="noreferrer" className="post-link" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> Read article</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}