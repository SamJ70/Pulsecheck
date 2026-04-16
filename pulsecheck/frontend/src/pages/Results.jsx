// frontend/src/pages/Results.jsx — FULL REPLACEMENT (v2 — addictive edition)
import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Search, ExternalLink, ThumbsUp, ThumbsDown, MessageCircle,
  Flame, Heart, Repeat2, AlertTriangle, Lightbulb, Target,
  TrendingUp, Users, Zap, ChevronRight, Share2, Copy, Check,
  BarChart2, Activity, Globe, Sparkles, Radio,
} from 'lucide-react'
import axios from 'axios'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import './Results.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const SENTIMENT_COLOR = { Positive: '#22c55e', Negative: '#ef4444', Mixed: '#f59e0b', Neutral: '#818cf8' }
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#06b6d4', '#f97316']

const PERSONAS = [
  { id: 'general',    label: 'General Public', icon: '🌐', desc: 'What does everyone think?' },
  { id: 'company',    label: 'Brand/Company',  icon: '🏢', desc: 'Customer & market intel' },
  { id: 'politician', label: 'Political',       icon: '🏛️', desc: 'Voter sentiment & issues' },
  { id: 'researcher', label: 'Researcher',      icon: '🔬', desc: 'Academic discourse analysis' },
]

const PLATFORM_COLOR = { instagram: '#e1306c', twitter: '#1da1f2', reddit: '#ff4500', youtube: '#ff0000', news: '#06b6d4', hackernews: '#f97316' }
const PLATFORM_EMOJI = { instagram: '📸', twitter: '𝕏', reddit: '🟠', youtube: '▶', news: '📰', hackernews: '🔥' }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Results({ query, onBack, onSearch }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [input, setInput]       = useState(query)
  const [activeTab, setActiveTab] = useState('pulse')
  const [persona, setPersona]   = useState('general')
  const [showPersonaPicker, setShowPersonaPicker] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [hotTakeIndex, setHotTakeIndex] = useState(0)
  const hotTakeTimer = useRef(null)

  useEffect(() => { fetchData(query, persona) }, [query])

  // Auto-rotate hot takes every 4s for that addictive feel
  useEffect(() => {
    if (!data?.hotTakes?.length) return
    hotTakeTimer.current = setInterval(() => {
      setHotTakeIndex(i => (i + 1) % data.hotTakes.length)
    }, 4000)
    return () => clearInterval(hotTakeTimer.current)
  }, [data?.hotTakes])

  function fetchData(q, p) {
    setLoading(true); setError(null); setData(null); setInput(q)
    axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(q)}&persona=${p}`)
      .then(r => { setData(r.data); setHotTakeIndex(0) })
      .catch(e => setError(e.response?.data?.error || 'Failed to fetch. Is the backend running?'))
      .finally(() => setLoading(false))
  }

  function submit(q) {
    const nq = (q || input).trim()
    if (nq.length > 1) onSearch(nq)
  }

  function switchPersona(p) {
    setPersona(p); setShowPersonaPicker(false); fetchData(query, p)
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href + `?q=${encodeURIComponent(query)}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const score     = data?.summary?.sentimentScore || 0
  const sentiment = data?.summary?.sentiment || 'Neutral'
  const sColor    = SENTIMENT_COLOR[sentiment] || '#818cf8'
  const emotions  = data?.summary?.emotions || {}
  const pieData   = data ? Object.entries(data.sourceCounts || {}).map(([name, value]) => ({ name, value })) : []
  const radarData = Object.entries(emotions).map(([emotion, value]) => ({ emotion, value }))
  const currentPersona = PERSONAS.find(p => p.id === persona) || PERSONAS[0]

  const TABS = [
    { id: 'pulse',     label: '⚡ Pulse',      badge: null },
    { id: 'hottakes',  label: '🔥 Hot Takes',  badge: data?.hotTakes?.length },
    { id: 'battle',    label: '⚔️ Battle',     badge: null },
    { id: 'social',    label: '📱 Social',     badge: (data?.socialPosts?.length || 0) + (data?.youtubePosts?.length || 0) },
    { id: 'posts',     label: '🟠 Reddit',     badge: data?.topPosts?.length },
    { id: 'news',      label: '📰 News',       badge: data?.recentNews?.length },
    { id: 'deepdive',  label: '🔬 Deep Dive',  badge: null },
  ]

  return (
    <div className="results-page">
      {/* ── Top Bar ── */}
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
        <button className="icon-btn" onClick={copyLink} title="Copy link">
          {copied ? <Check size={15} color="#22c55e" /> : <Share2 size={15} />}
        </button>
      </div>

      {/* ── Persona Picker ── */}
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

      {/* ── Loading ── */}
      {loading && (
        <div className="loading-state">
          <div className="loading-orbs">
            <div className="orb orb1" /><div className="orb orb2" /><div className="orb orb3" />
          </div>
          <p className="loading-title">Scanning the internet for <em>"{query}"</em></p>
          <div className="loading-sources">
            {['Reddit','Twitter','Instagram','News','HackerNews'].map((s, i) => (
              <span key={s} className="loading-source-chip" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="error-state">
          <div className="error-title">Something went wrong</div>
          <div className="error-msg">{error}</div>
          <div className="error-hint">Make sure backend is running: <code>node server.js</code></div>
        </div>
      )}

      {/* ── Results ── */}
      {data && (
        <div className="results-body fade-in">

          {/* ── Hero Header ── */}
          <div className="results-hero">
            <div className="results-hero-left">
              <h1 className="query-title">"{query}"</h1>
              <div className="query-meta">
                <span className={`tag ${sentiment.toLowerCase()}`}>{sentiment}</span>
                <span className="tag"><Activity size={10} /> {data.totalDataPoints} signals</span>
                <span className="tag">{currentPersona.icon} {currentPersona.label}</span>
                {data.cached && <span className="tag">⚡ Cached</span>}
              </div>
            </div>
            <div className="hero-score-ring" style={{ '--sc': sColor }}>
              <div className="score-ring-inner">
                <span className="score-big" style={{ color: sColor }}>{score}</span>
                <span className="score-unit">/ 100</span>
              </div>
            </div>
          </div>

          {/* ── Stat Cards row ── */}
          {(data.statCards || []).length > 0 && (
            <div className="stat-cards-row">
              {data.statCards.map((card, i) => (
                <a key={i} className="stat-card" href={card.url || '#'} target="_blank" rel="noreferrer"
                   style={{ '--sc': card.color }}>
                  <div className="stat-card-icon">{card.icon}</div>
                  <div>
                    <div className="stat-card-label">{card.label}</div>
                    <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
                    <div className="stat-card-sub">{card.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* ── Executive Summary ── */}
          {data.summary?.executiveSummary && (
            <div className="exec-summary-card">
              <div className="exec-summary-label"><Sparkles size={12} /> Intelligence Brief</div>
              <p className="exec-summary-text">{data.summary.executiveSummary}</p>
            </div>
          )}

          {/* ── Wikipedia context ── */}
          {data.wikiSummary && (
            <div className="wiki-box">
              <div className="wiki-label">📖 Context</div>
              <p>{data.wikiSummary.slice(0, 320)}{data.wikiSummary.length > 320 ? '…' : ''}</p>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="tabs-wrap">
            <div className="tabs">
              {TABS.map(t => (
                <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                  {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="tab-content">

            {/* ════════════ PULSE TAB ════════════ */}
            {activeTab === 'pulse' && (
              <>
                {/* Sentiment + Emotion radar */}
                <div className="overview-top">
                  <div className="card sentiment-card">
                    <div className="sentiment-score-wrap">
                      <div className="sentiment-circle" style={{ '--score-color': sColor }}>
                        <span className="score-num" style={{ color: sColor }}>{score}</span>
                        <span className="score-label">/ 100</span>
                      </div>
                      <div>
                        <div className="sentiment-name" style={{ color: sColor }}>{sentiment}</div>
                        <div className="sentiment-desc">Public Sentiment</div>
                        <div className="score-bar" style={{ marginTop: 10, width: 160 }}>
                          <div className="score-fill" style={{ width: `${score}%`, background: sColor }} />
                        </div>
                      </div>
                    </div>
                    <div className="trending-opinion">
                      <div className="to-label">📢 What people are saying</div>
                      <p>{data.summary.trendingOpinion}</p>
                    </div>
                  </div>
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
                    ) : <div className="empty-state">No emotion data</div>}
                  </div>
                </div>

                {/* Source breakdown */}
                <div className="card">
                  <div className="card-title"><Globe size={14} /> Data Sources</div>
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
                          <span className="legend-name">{d.name}</span>
                          <span className="legend-count">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trending phrases word cloud */}
                {(data.trendingPhrases || []).length > 0 && (
                  <div className="card">
                    <div className="card-title"><Radio size={14} /> Trending Phrases</div>
                    <div className="phrase-cloud">
                      {data.trendingPhrases.map((p, i) => {
                        const size = Math.max(11, Math.min(22, 11 + (p.count * 1.5)))
                        const opacity = Math.max(0.5, Math.min(1, 0.5 + p.count * 0.05))
                        return (
                          <button key={i} className="phrase-chip" onClick={() => onSearch(p.phrase)}
                            style={{ fontSize: size, opacity }}>
                            {p.phrase}
                            <span className="phrase-count">{p.count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Key Themes */}
                <div className="card">
                  <div className="card-title">🎯 Key Themes</div>
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
                          <span className="viral-rank">#{i + 1}</span><span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div className="card verdict-card">
                  <div className="card-title">🤖 AI Verdict</div>
                  <p className="verdict-text">{data.summary.verdict}</p>
                  {data.summary.demographicGuess && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div className="to-label"><Users size={11} style={{ display: 'inline', marginRight: 4 }} /> Who's talking</div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{data.summary.demographicGuess}</p>
                    </div>
                  )}
                </div>

                {/* Follow-ups */}
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
                    <div className="card-title"><Flame size={14} style={{ color: 'var(--orange)' }} /> HackerNews Discussions</div>
                    {data.hackerNews.map((h, i) => (
                      <div key={i} className="hn-item">
                        <a href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
                        <span className="hn-meta">{h.score} pts · {h.comments} comments</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ════════════ HOT TAKES TAB ════════════ */}
            {activeTab === 'hottakes' && (
              <>
                {/* Spotlight card — auto-rotates */}
                {(data.hotTakes || []).length > 0 && (
                  <div className="spotlight-card">
                    <div className="spotlight-label">
                      <Flame size={14} />
                      <span>🔥 Hot Take #{hotTakeIndex + 1} of {data.hotTakes.length}</span>
                      <div className="spotlight-dots">
                        {data.hotTakes.map((_, i) => (
                          <button key={i}
                            className={`spotlight-dot ${i === hotTakeIndex ? 'active' : ''}`}
                            onClick={() => setHotTakeIndex(i)} />
                        ))}
                      </div>
                    </div>
                    <blockquote className="spotlight-quote">
                      "{data.hotTakes[hotTakeIndex]?.text}"
                    </blockquote>
                    <div className="spotlight-footer">
                      <PlatformBadge platform={data.hotTakes[hotTakeIndex]?.platform} />
                      {data.hotTakes[hotTakeIndex]?.subreddit && (
                        <span className="tag">r/{data.hotTakes[hotTakeIndex].subreddit}</span>
                      )}
                      <span className="tag">
                        🔥 Fire score: {data.hotTakes[hotTakeIndex]?.opinionScore}
                      </span>
                      {data.hotTakes[hotTakeIndex]?.url && data.hotTakes[hotTakeIndex].url !== '#' && (
                        <a href={data.hotTakes[hotTakeIndex].url} target="_blank" rel="noreferrer"
                           className="post-link" style={{ marginLeft: 'auto' }}>
                          <ExternalLink size={12} /> Source
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* All hot takes feed */}
                <div className="card-title" style={{ marginBottom: 12 }}>All Hot Takes</div>
                {(data.hotTakes || []).map((take, i) => (
                  <HotTakeCard key={take.id} take={take} rank={i + 1} onClick={() => setHotTakeIndex(i)} active={i === hotTakeIndex} />
                ))}

                {(!data.hotTakes?.length) && (
                  <div className="empty-state">No strong opinions found for this topic yet.</div>
                )}
              </>
            )}

            {/* ════════════ BATTLE TAB ════════════ */}
            {activeTab === 'battle' && data.opinionBattle && (
              <>
                <OpinionBattle battle={data.opinionBattle} query={query} />
              </>
            )}

            {/* ════════════ SOCIAL TAB ════════════ */}
            {activeTab === 'social' && (
              <>
                {/* Instagram */}
                {(data.socialPosts || []).filter(p => p.platform === 'instagram').length > 0 && (
                  <div>
                    <div className="platform-section-header">
                      <span className="platform-badge insta">📸 Instagram</span>
                      <span className="platform-count">{data.socialPosts.filter(p => p.platform === 'instagram').length} posts</span>
                    </div>
                    <div className="social-feed">
                      {data.socialPosts.filter(p => p.platform === 'instagram').map((p, i) => (
                        <SocialCard key={i} post={p} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Twitter */}
                {(data.socialPosts || []).filter(p => p.platform === 'twitter').length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div className="platform-section-header">
                      <span className="platform-badge twitter">𝕏 Twitter / X</span>
                      <span className="platform-count">{data.socialPosts.filter(p => p.platform === 'twitter').length} tweets</span>
                    </div>
                    <div className="social-feed">
                      {data.socialPosts.filter(p => p.platform === 'twitter').map((p, i) => (
                        <SocialCard key={i} post={p} />
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube */}
                {(data.youtubePosts || []).length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div className="platform-section-header">
                      <span className="platform-badge youtube">▶ YouTube Comments</span>
                      <span className="platform-count">{data.youtubePosts.length} comments</span>
                    </div>
                    {data.youtubePosts.map((p, i) => (
                      <div key={i} className="card comment-card">
                        <div className="comment-header">
                          <span className="tag platform-badge youtube" style={{ fontSize: 11 }}>YouTube</span>
                          <span className="comment-score"><ThumbsUp size={11} /> {p.likes}</span>
                        </div>
                        <p className="comment-text">"{p.text}"</p>
                        <a href={p.url} target="_blank" rel="noreferrer" className="post-link">
                          <ExternalLink size={12} /> Watch video
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {!(data.socialPosts?.length) && !(data.youtubePosts?.length) && (
                  <div className="empty-state">
                    <p>Social media data is limited due to platform restrictions.</p>
                    <p style={{ marginTop: 8, fontSize: 13 }}>Try searching on Reddit for community discussions instead.</p>
                  </div>
                )}
              </>
            )}

            {/* ════════════ REDDIT TAB ════════════ */}
            {activeTab === 'posts' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>🟠 Top Reddit Posts</div>
                {(data.topPosts || []).length === 0 && <div className="empty-state">No posts found.</div>}
                {(data.topPosts || []).map((p, i) => (
                  <div key={i} className="card post-card">
                    <div className="post-meta">
                      <span className="tag" style={{ borderColor: '#ff450030', background: '#ff450010', color: '#ff4500' }}>r/{p.subreddit}</span>
                      <span className="post-time">{new Date(p.created).toLocaleDateString()}</span>
                    </div>
                    <div className="post-title">{p.title}</div>
                    {p.text && <p className="post-text">{p.text.slice(0, 200)}{p.text.length > 200 ? '…' : ''}</p>}
                    <div className="post-footer">
                      <span className="post-stat"><ThumbsUp size={12} /> {p.score?.toLocaleString()}</span>
                      <span className="post-stat"><MessageCircle size={12} /> {p.comments}</span>
                      {p.upvoteRatio && <span className="post-stat">{Math.round(p.upvoteRatio * 100)}% upvoted</span>}
                      <a href={p.url} target="_blank" rel="noreferrer" className="post-link">
                        <ExternalLink size={12} /> View post
                      </a>
                    </div>
                  </div>
                ))}

                {/* Comments */}
                <div className="card-title" style={{ margin: '20px 0 12px' }}>💬 Top Comments</div>
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
              </>
            )}

            {/* ════════════ NEWS TAB ════════════ */}
            {activeTab === 'news' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>📰 News Coverage</div>
                {(data.recentNews || []).length === 0 && <div className="empty-state">No news found.</div>}
                {(data.recentNews || []).map((n, i) => (
                  <div key={i} className="card">
                    <div className="news-meta">
                      <span className="tag" style={{ borderColor: '#06b6d430', background: '#06b6d410', color: '#06b6d4' }}>{n.feedSource}</span>
                      <span className="post-time">{n.created ? new Date(n.created).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="post-title">{n.title}</div>
                    {n.text && <p className="post-text">{n.text}</p>}
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer"
                         className="post-link" style={{ marginTop: 8, display: 'inline-flex', gap: 4 }}>
                        <ExternalLink size={12} /> Read article
                      </a>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ════════════ DEEP DIVE TAB ════════════ */}
            {activeTab === 'deepdive' && (
              <>
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

                {(data.summary.riskSignals || []).length > 0 && (
                  <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
                    <div className="card-title negative-title"><AlertTriangle size={14} /> Risk Signals</div>
                    <ul className="point-list">
                      {data.summary.riskSignals.map((r, i) => <li key={i} className="point negative">{r}</li>)}
                    </ul>
                  </div>
                )}

                {(data.summary.opportunityFlags || []).length > 0 && (
                  <div className="card" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.03)' }}>
                    <div className="card-title positive-title"><Target size={14} /> Opportunity Flags</div>
                    <ul className="point-list">
                      {data.summary.opportunityFlags.map((o, i) => <li key={i} className="point positive">{o}</li>)}
                    </ul>
                  </div>
                )}

                {data.summary.platformBreakdown && (
                  <div className="card">
                    <div className="card-title"><TrendingUp size={14} /> Platform Intelligence</div>
                    <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{data.summary.platformBreakdown}</p>
                  </div>
                )}

                {(data.timelineData || []).length > 3 && (
                  <div className="card">
                    <div className="card-title"><Activity size={14} /> Activity Timeline</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={data.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }) {
  const color = PLATFORM_COLOR[platform] || '#818cf8'
  const emoji = PLATFORM_EMOJI[platform] || '💬'
  return (
    <span className="tag" style={{
      background: color + '18', borderColor: color + '40', color,
    }}>{emoji} {platform}</span>
  )
}

function HotTakeCard({ take, rank, onClick, active }) {
  return (
    <div className={`card hot-take-card ${active ? 'ht-active' : ''}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="ht-header">
        <span className="ht-rank">#{rank}</span>
        <PlatformBadge platform={take.platform} />
        {take.subreddit && <span className="tag">r/{take.subreddit}</span>}
        <span className="ht-fire">🔥 {take.opinionScore}</span>
      </div>
      <p className="ht-text">"{take.text}"</p>
      <div className="ht-footer">
        {take.score > 0 && <span className="post-stat"><ThumbsUp size={11} /> {take.score}</span>}
        {take.url && take.url !== '#' && (
          <a href={take.url} target="_blank" rel="noreferrer" className="post-link" onClick={e => e.stopPropagation()}>
            <ExternalLink size={11} /> Source
          </a>
        )}
      </div>
    </div>
  )
}

function OpinionBattle({ battle, query }) {
  const { supportPercent, againstPercent, supportVoices, againstVoices } = battle
  return (
    <div>
      <div className="battle-header">
        <h2 className="battle-title">⚔️ Opinion Battle: <em>{query}</em></h2>
        <p className="battle-sub">Real voices — for and against</p>
      </div>

      {/* VS bar */}
      <div className="battle-bar-wrap">
        <div className="battle-side support">
          <span className="battle-emoji">👍</span>
          <span className="battle-pct">{supportPercent}%</span>
          <span className="battle-side-label">Support</span>
        </div>
        <div className="battle-bar">
          <div className="battle-fill support" style={{ width: `${supportPercent}%` }} />
          <div className="battle-fill against" style={{ width: `${againstPercent}%` }} />
        </div>
        <div className="battle-side against">
          <span className="battle-side-label">Against</span>
          <span className="battle-pct">{againstPercent}%</span>
          <span className="battle-emoji">👎</span>
        </div>
      </div>

      {/* Voices */}
      <div className="battle-voices">
        <div className="battle-voices-col">
          <div className="battle-col-title" style={{ color: '#22c55e' }}>✅ Supporters say</div>
          {supportVoices.map((v, i) => (
            <div key={i} className="battle-voice support-voice">
              <p>"{v.text.slice(0, 180)}"</p>
              <span className="tag" style={{ fontSize: 10 }}>{v.source}</span>
            </div>
          ))}
          {supportVoices.length === 0 && <div className="empty-state" style={{ padding: '16px 0' }}>No support found</div>}
        </div>
        <div className="battle-voices-col">
          <div className="battle-col-title" style={{ color: '#ef4444' }}>❌ Critics say</div>
          {againstVoices.map((v, i) => (
            <div key={i} className="battle-voice against-voice">
              <p>"{v.text.slice(0, 180)}"</p>
              <span className="tag" style={{ fontSize: 10 }}>{v.source}</span>
            </div>
          ))}
          {againstVoices.length === 0 && <div className="empty-state" style={{ padding: '16px 0' }}>No criticism found</div>}
        </div>
      </div>
    </div>
  )
}

function SocialCard({ post }) {
  const color = PLATFORM_COLOR[post.platform] || '#818cf8'
  return (
    <div className="card social-card">
      <div className="social-header">
        <span className="social-platform-dot" style={{ background: color }} />
        <span className="social-username">{post.username || '@user'}</span>
        <span className="post-time" style={{ marginLeft: 'auto' }}>
          {post.created ? new Date(post.created).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="social-text">{post.text}</p>
      <div className="post-footer">
        {post.likes > 0 && <span className="post-stat"><Heart size={12} style={{ color }} /> {post.likes.toLocaleString()}</span>}
        {post.retweets > 0 && <span className="post-stat"><Repeat2 size={12} /> {post.retweets.toLocaleString()}</span>}
        {post.replies > 0 && <span className="post-stat"><MessageCircle size={12} /> {post.replies.toLocaleString()}</span>}
        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" className="post-link">
            <ExternalLink size={12} /> View
          </a>
        )}
      </div>
    </div>
  )
}