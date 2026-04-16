// backend/utils/hottakes.js
// Extracts viral quotes, strong opinions, and debate-worthy statements
// These make the app addictive — people want to see what others actually said

const axios = require('axios');

// ── Opinion strength scorer ───────────────────────────────────────────────────
const STRONG_OPINION_WORDS = [
  'absolutely', 'definitely', 'literally', 'honestly', 'genuinely',
  'worst', 'best', 'terrible', 'amazing', 'disgusting', 'incredible',
  'ridiculous', 'insane', 'unbelievable', 'shocking', 'pathetic',
  'brilliant', 'stupid', 'genius', 'idiotic', 'perfect', 'broken',
  'scam', 'fraud', 'revolutionary', 'overrated', 'underrated',
  'change my mind', 'unpopular opinion', 'hot take', 'controversial',
  'nobody talks about', 'everyone ignores', 'wake up', 'truth is',
];

const CONTROVERSY_MARKERS = [
  'but', 'however', 'actually', 'though', 'yet', 'despite',
  'surprisingly', 'contrary', 'opposite', 'disagree', 'wrong',
];

function scoreOpinionStrength(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;

  STRONG_OPINION_WORDS.forEach(w => { if (lower.includes(w)) score += 10; });
  CONTROVERSY_MARKERS.forEach(w => { if (lower.includes(w)) score += 5; });

  // Bonus for certain patterns
  if (lower.includes('?')) score += 3;       // rhetorical questions
  if (lower.includes('!')) score += 4;       // strong emotion
  if (/\b(i think|i feel|i believe|imo|imho|tbh)\b/i.test(lower)) score += 8;
  if (/\b(never|always|every|all|none|no one)\b/i.test(lower)) score += 6;
  if (text.length > 80 && text.length < 300) score += 5; // sweet spot length
  if (/\d+/.test(text)) score += 3;          // stats or numbers

  return score;
}

// ── Extract hot takes from raw data ──────────────────────────────────────────
function extractHotTakes(dataPoints, limit = 8) {
  const candidates = dataPoints
    .filter(d => d.text && d.text.length > 30)
    .map(d => ({
      ...d,
      opinionScore: scoreOpinionStrength(d.text) + (d.score || 0) * 0.01,
    }))
    .sort((a, b) => b.opinionScore - a.opinionScore)
    .slice(0, limit * 3); // over-fetch then deduplicate

  // Deduplicate by similarity (simple word overlap)
  const selected = [];
  for (const item of candidates) {
    const words = new Set(item.text.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const isDuplicate = selected.some(s => {
      const sWords = new Set(s.text.toLowerCase().split(/\W+/).filter(w => w.length > 4));
      const intersection = [...words].filter(w => sWords.has(w)).length;
      return intersection / Math.max(words.size, sWords.size) > 0.5;
    });

    if (!isDuplicate) selected.push(item);
    if (selected.length >= limit) break;
  }

  return selected.map(item => ({
    id: Math.random().toString(36).slice(2),
    text: item.text.slice(0, 280),
    source: item.source,
    platform: item.source === 'reddit_comment' ? 'reddit' : (item.platform || item.source),
    score: item.score || 0,
    url: item.url || '#',
    subreddit: item.subreddit || null,
    username: item.username || null,
    opinionScore: Math.round(item.opinionScore),
    created: item.created || new Date().toISOString(),
  }));
}

// ── Build "For vs Against" battle ─────────────────────────────────────────────
function buildOpinionBattle(dataPoints) {
  const positive = [];
  const negative = [];

  const positiveWords = ['good', 'great', 'love', 'amazing', 'excellent', 'best', 'awesome', 'fantastic', 'brilliant', 'perfect', 'support', 'recommend', 'helpful', 'works', 'impressed'];
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'broken', 'scam', 'disappointing', 'fraud', 'useless', 'failed', 'issue', 'problem', 'concern', 'wrong'];

  for (const d of dataPoints) {
    if (!d.text || d.text.length < 30) continue;
    const lower = d.text.toLowerCase();
    const posCount = positiveWords.filter(w => lower.includes(w)).length;
    const negCount = negativeWords.filter(w => lower.includes(w)).length;

    if (posCount > negCount && positive.length < 5) {
      positive.push({ text: d.text.slice(0, 200), score: d.score || 0, source: d.source });
    } else if (negCount > posCount && negative.length < 5) {
      negative.push({ text: d.text.slice(0, 200), score: d.score || 0, source: d.source });
    }
    if (positive.length >= 5 && negative.length >= 5) break;
  }

  const supportScore = positive.reduce((acc, p) => acc + (p.score || 0), 0);
  const againstScore = negative.reduce((acc, p) => acc + (p.score || 0), 0);
  const total = supportScore + againstScore || 1;

  return {
    supportPercent: Math.round((supportScore / total) * 100),
    againstPercent: Math.round((againstScore / total) * 100),
    supportVoices: positive,
    againstVoices: negative,
  };
}

// ── Build stat cards from data ────────────────────────────────────────────────
function buildStatCards(data) {
  const { topPosts = [], topComments = [], recentNews = [], socialPosts = [], summary = {} } = data;

  const topPost = topPosts.sort((a, b) => b.score - a.score)[0];
  const topComment = topComments.sort((a, b) => b.score - a.score)[0];
  const mostActive = Object.entries(data.sourceCounts || {}).sort((a, b) => b[1] - a[1])[0];

  return [
    topPost && {
      icon: '🔥',
      label: 'Most Viral Post',
      value: topPost.score?.toLocaleString() + ' upvotes',
      sub: topPost.title?.slice(0, 60) + '...',
      url: topPost.url,
      color: '#f97316',
    },
    topComment && {
      icon: '💬',
      label: 'Top Comment',
      value: topComment.score?.toLocaleString() + ' pts',
      sub: '"' + topComment.text?.slice(0, 60) + '..."',
      color: '#6366f1',
    },
    mostActive && {
      icon: '📡',
      label: 'Most Active Platform',
      value: mostActive[0].toUpperCase(),
      sub: mostActive[1] + ' data points collected',
      color: '#22c55e',
    },
    summary.sentimentScore && {
      icon: summary.sentimentScore > 60 ? '😍' : summary.sentimentScore < 40 ? '😤' : '🤔',
      label: 'Vibe Score',
      value: summary.sentimentScore + '/100',
      sub: summary.sentiment + ' overall sentiment',
      color: summary.sentimentScore > 60 ? '#22c55e' : summary.sentimentScore < 40 ? '#ef4444' : '#f59e0b',
    },
  ].filter(Boolean);
}

// ── Trending phrases extractor ────────────────────────────────────────────────
function extractTrendingPhrases(dataPoints, topN = 10) {
  const phraseCount = {};
  const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was', 'its', 'not', 'but', 'they', 'been', 'will', 'more', 'also', 'can', 'all', 'one', 'would', 'about', 'when', 'there', 'what']);

  for (const d of dataPoints) {
    const words = (d.text || d.title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Count bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      phraseCount[bigram] = (phraseCount[bigram] || 0) + 1;
    }

    // Count single words too
    for (const w of words) {
      phraseCount[w] = (phraseCount[w] || 0) + 0.5;
    }
  }

  return Object.entries(phraseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([phrase, count]) => ({ phrase, count: Math.round(count) }));
}

module.exports = {
  extractHotTakes,
  buildOpinionBattle,
  buildStatCards,
  extractTrendingPhrases,
  scoreOpinionStrength,
};