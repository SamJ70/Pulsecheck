// frontend/src/pages/Results.jsx — FULL REPLACEMENT
import { useState, useEffect } from 'react'
import { ArrowLeft, Search, ExternalLink, ThumbsUp, ThumbsDown, MessageCircle, 
         Flame, Heart, Repeat2, AlertTriangle, Lightbulb, Target, 
         TrendingUp, Users, Zap, ChevronRight, Play } from 'lucide-react'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
         RadarChart, Radar, PolarGrid, PolarAngleAxis,
         LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import './Results.css'

const SENTIMENT_COLOR = { Positive: '#22c55e', Negative: '#ef4444', Mixed: '#f59e0b', Neutral: '#818cf8' }
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#06b6d4']

const PERSONAS = [
  { id: 'general', label: 'General Public', icon: '🌐', desc: 'What does everyone think?' },
  { id: 'company', label: 'Brand/Company', icon: '🏢', desc: 'Customer & market intel' },
  { id: 'politician', label: 'Political', icon: '🏛️', desc: 'Voter sentiment & issues' },
  { id: 'researcher', label: 'Researcher', icon: '🔬', desc: 'Academic discourse analysis' },
]

export default function Results({ query, onBack, onSearch }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [input, setInput] = useState(query)
  const [activeTab, setActiveTab] = useState('overview')
  const [persona, setPersona] = useState('general')
  const [showPersonaPicker, setShowPersonaPicker] = useState(false)

  useEffect(() => {
    fetchData(query, persona)
  }, [query])

  function fetchData(q, p) {
    setLoading(true)
    setError(null)
    setData(null)
    setInput(q)
    axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(q)}&persona=${p}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to fetch. Is the backend running?'))
      .finally(() => setLoading(false))
  }

  function submit(q) {
    const nq = (q || input).trim()
    if (nq.length > 1) onSearch(nq)
  }

  function switchPersona(p) {
    setPersona(p)
    setShowPersonaPicker(false)
    fetchData(query, p)
  }

  const score = data?.summary?.sentimentScore || 0
  const sentiment = data?.summary?.sentiment || 'Neutral'
  const sColor = SENTIMENT_COLOR[sentiment] || '#818cf8'
  const emotions = data?.summary?.emotions || {}
  const pieData = data ? Object.entries(data.sourceCounts || {}).map(([name, value]) => ({ name, value })) : []
  const radarData = Object.entries(emotions).map(([emotion, value]) => ({ emotion, value }))
  const currentPersona = PERSONAS.find(p => p.id === persona) || PERSONAS[0]

  return (
    <div className="results-page">
      {/* Sticky top bar */}
      <div className="results-topbar">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /></button>
        <div className="search-wrap topbar-search">
          <input className="search-input" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
          <button className="search-btn" onClick={() => submit()}><Search size={14} /></button>
        </div>
        <button className="persona-btn" onClick={() => setShowPersonaPicker(!showPersonaPicker)}>
          <span>{currentPersona.icon}</span>
          <span className="persona-btn-label">{currentPersona.label}</span>
          <ChevronRight size={14} style={{ transform: showPersonaPicker ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {/* Persona picker dropdown */}
      {showPersonaPicker && (
        <div className="persona-dropdown">
          <div className="persona-dropdown-title">Analyze as...</div>
          {PERSONAS.map(p => (
            <button key={p.id} className={`persona-option ${persona === p.id ? 'active' : ''}`} onClick={() => switchPersona(p.id)}>
              <span className="persona-option-icon">{p.icon}</span>
              <div>
                <div className="persona-option-label">{p.label}</div>
                <div className="persona-option-desc">{p.desc}</div>
              </div>
              {persona === p.id && <span className="persona-active-dot" />}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Scanning Reddit, News, Instagram, Twitter...</p>
          <p className="loading-sub">Aggregating public intelligence</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <div className="error-title">Something went wrong</div>
          <div className="error-msg">{error}</div>
          <div className="error-hint">Make sure backend is running: <code>node server.js</code></div>
        </div>
      )}

      {data && (
        <div className="results-body fade-in">
          {/* Header */}
          <div className="query-header">
            <h1 className="query-title">"{query}"</h1>
            <div className="query-meta">
              <span className={`tag ${sentiment.toLowerCase()}`}>{sentiment}</span>
              <span className="tag">{data.totalDataPoints} data points</span>
              <span className="tag">{currentPersona.icon} {currentPersona.label} view</span>
              {data.cached && <span className="tag">Cached</span>}
            </div>
          </div>

          {/* Executive Summary — always visible, above tabs */}
          {data.summary?.executiveSummary && (
            <div className="exec-summary-card">
              <div className="exec-summary-label"><Zap size={12} /> Intelligence Brief</div>
              <p className="exec-summary-text">{data.summary.executiveSummary}</p>
            </div>
          )}

          {/* Wikipedia context */}
          {data.wikiSummary && (
            <div className="wiki-box">
              <div className="wiki-label">Context</div>
              <p>{data.wikiSummary.slice(0, 300)}{data.wikiSummary.length > 300 ? '...' : ''}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {['overview', 'social', 'posts', 'comments', 'news', 'deep-dive'].map(t => (
              <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t === 'deep-dive' ? '🔍 Deep Dive' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              {/* Score + Emotions + Sources */}
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

                {/* Emotion Radar */}
                <div className="card">
                  <div className="card-title">Emotional Breakdown</div>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="emotion" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                        <Radar name="Emotion" dataKey="value" stroke={sColor} fill={sColor} fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>No emotion data</div>}
                </div>
              </div>

              {/* Source breakdown */}
              <div className="card source-chart-card">
                <div className="card-title">Data Sources</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {pieData.length > 0 && (
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
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

              {/* Key Themes */}
              <div className="card">
                <div className="card-title">Key Themes</div>
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

              {/* Viral Moments */}
              {(data.summary.viralMoments || []).length > 0 && (
                <div className="card">
                  <div className="card-title"><Flame size={14} style={{ color: 'var(--orange)' }} /> Viral Moments</div>
                  <div className="viral-list">
                    {data.summary.viralMoments.map((m, i) => (
                      <div key={i} className="viral-item">
                        <span className="viral-rank">#{i+1}</span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verdict */}
              <div className="card verdict-card">
                <div className="card-title">AI Verdict</div>
                <p className="verdict-text">{data.summary.verdict}</p>
                {data.summary.demographicGuess && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div className="to-label"><Users size={11} style={{ display: 'inline', marginRight: 4 }} /> Who's talking</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{data.summary.demographicGuess}</p>
                  </div>
                )}
              </div>

              {/* Follow-up questions */}
              {(data.summary.suggestedFollowUps || []).length > 0 && (
                <div className="card">
                  <div className="card-title"><Zap size={14} /> Dig deeper</div>
                  <div className="followup-list">
                    {data.summary.suggestedFollowUps.map((q, i) => (
                      <button key={i} className="followup-chip" onClick={() => onSearch(q)}>
                        {q} <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* HackerNews */}
              {(data.hackerNews || []).length > 0 && (
                <div className="card">
                  <div className="card-title"><Flame size={14} style={{ color: 'var(--orange)' }} /> HackerNews</div>
                  {data.hackerNews.map((h, i) => (
                    <div key={i} className="hn-item">
                      <a href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
                      <span className="hn-meta">{h.score} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== SOCIAL TAB ===== */}
          {activeTab === 'social' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>Social Media Pulse</div>
              
              {/* Instagram posts */}
              {(data.socialPosts || []).filter(p => p.platform === 'instagram').length > 0 && (
                <div>
                  <div className="platform-header">
                    <span className="platform-badge insta">📸 Instagram</span>
                  </div>
                  <div className="social-feed">
                    {data.socialPosts.filter(p => p.platform === 'instagram').map((p, i) => (
                      <SocialCard key={i} post={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Twitter posts */}
              {(data.socialPosts || []).filter(p => p.platform === 'twitter').length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="platform-header">
                    <span className="platform-badge twitter">𝕏 Twitter / X</span>
                  </div>
                  <div className="social-feed">
                    {data.socialPosts.filter(p => p.platform === 'twitter').map((p, i) => (
                      <SocialCard key={i} post={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube comments */}
              {(data.youtubePosts || []).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="platform-header">
                    <span className="platform-badge youtube">▶ YouTube</span>
                  </div>
                  {data.youtubePosts.map((p, i) => (
                    <div key={i} className="card comment-card">
                      <div className="comment-header">
                        <span className="tag">YouTube Comment</span>
                        <span className="comment-score"><ThumbsUp size={11} /> {p.likes}</span>
                      </div>
                      <p className="comment-text">"{p.text}"</p>
                      <a href={p.url} target="_blank" rel="noreferrer" className="post-link"><ExternalLink size={12} /> Watch video</a>
                    </div>
                  ))}
                </div>
              )}

              {!(data.socialPosts?.length) && !(data.youtubePosts?.length) && (
                <div className="empty-state">
                  <p>No social media data found.</p>
                  <p style={{ marginTop: 8, fontSize: 13 }}>Instagram scraping is rate-limited. Try again in a few minutes, or add a YouTube API key in <code>.env</code></p>
                </div>
              )}
            </div>
          )}

          {/* ===== POSTS TAB ===== */}
          {activeTab === 'posts' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>Top Reddit Posts</div>
              {(data.topPosts || []).length === 0 && <div className="empty-state">No posts found.</div>}
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

          {/* ===== COMMENTS TAB ===== */}
          {activeTab === 'comments' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>Top Reddit Comments</div>
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

          {/* ===== NEWS TAB ===== */}
          {activeTab === 'news' && (
            <div className="tab-content">
              <div className="card-title" style={{ marginBottom: 12 }}>News Coverage</div>
              {(data.recentNews || []).length === 0 && <div className="empty-state">No news found.</div>}
              {(data.recentNews || []).map((n, i) => (
                <div key={i} className="card">
                  <div className="news-meta">
                    <span className="tag">{n.feedSource}</span>
                    <span className="post-time">{n.created ? new Date(n.created).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="post-title">{n.title}</div>
                  {n.text && <p className="post-text">{n.text}</p>}
                  {n.url && <a href={n.url} target="_blank" rel="noreferrer" className="post-link" style={{ marginTop: 8, display: 'inline-flex', gap: 4 }}><ExternalLink size={12} /> Read article</a>}
                </div>
              ))}
            </div>
          )}

          {/* ===== DEEP DIVE TAB ===== */}
          {activeTab === 'deep-dive' && (
            <div className="tab-content">
              {/* Actionable Insights */}
              {(data.summary.actionableInsights || []).length > 0 && (
                <div className="card">
                  <div className="card-title"><Lightbulb size={14} style={{ color: 'var(--yellow)' }} /> Actionable Insights</div>
                  <div className="insight-list">
                    {data.summary.actionableInsights.map((ins, i) => (
                      <div key={i} className="insight-item">
                        <span className="insight-num">{i + 1}</span>
                        <span>{ins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Signals */}
              {(data.summary.riskSignals || []).length > 0 && (
                <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
                  <div className="card-title negative-title"><AlertTriangle size={14} /> Risk Signals</div>
                  <ul className="point-list">
                    {data.summary.riskSignals.map((r, i) => <li key={i} className="point negative">{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Opportunity Flags */}
              {(data.summary.opportunityFlags || []).length > 0 && (
                <div className="card" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.03)' }}>
                  <div className="card-title positive-title"><Target size={14} /> Opportunity Flags</div>
                  <ul className="point-list">
                    {data.summary.opportunityFlags.map((o, i) => <li key={i} className="point positive">{o}</li>)}
                  </ul>
                </div>
              )}

              {/* Platform Breakdown */}
              {data.summary.platformBreakdown && (
                <div className="card">
                  <div className="card-title"><TrendingUp size={14} /> Platform Intelligence</div>
                  <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{data.summary.platformBreakdown}</p>
                </div>
              )}

              {/* Timeline */}
              {(data.timelineData || []).length > 3 && (
                <div className="card">
                  <div className="card-title">Activity Timeline</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SocialCard({ post }) {
  return (
    <div className="card social-card">
      <div className="social-header">
        <span className="social-platform-dot" style={{ background: post.platform === 'instagram' ? '#e1306c' : '#1da1f2' }} />
        <span className="social-username">{post.username || '@user'}</span>
        <span className="post-time" style={{ marginLeft: 'auto' }}>{post.created ? new Date(post.created).toLocaleDateString() : ''}</span>
      </div>
      <p className="social-text">{post.text}</p>
      <div className="post-footer">
        {post.likes > 0 && <span className="post-stat"><Heart size={12} style={{ color: '#e1306c' }} /> {post.likes.toLocaleString()}</span>}
        {post.retweets > 0 && <span className="post-stat"><Repeat2 size={12} style={{ color: '#1da1f2' }} /> {post.retweets.toLocaleString()}</span>}
        {post.replies > 0 && <span className="post-stat"><MessageCircle size={12} /> {post.replies.toLocaleString()}</span>}
        {post.url && <a href={post.url} target="_blank" rel="noreferrer" className="post-link"><ExternalLink size={12} /> View</a>}
      </div>
    </div>
  )
}