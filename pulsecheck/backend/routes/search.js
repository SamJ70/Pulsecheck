// backend/routes/search.js — FULL REPLACEMENT
const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { searchReddit, getRedditComments } = require('../utils/reddit');
const { searchNews } = require('../utils/news');
const { getHackerNews, scrapeWikipediaSummary } = require('../utils/trends');
const { generateSummary } = require('../utils/groq');

// Lazy-load new scrapers so they don't break if modules are missing
let searchInstagram, searchTwitter, searchYoutube;
try { ({ searchInstagram } = require('../utils/instagram')); } catch {}
try { ({ searchTwitter } = require('../utils/twitter')); } catch {}
try { ({ searchYoutube } = require('../utils/youtube')); } catch {}

const cache = new NodeCache({ stdTTL: 600 });

router.get('/', async (req, res) => {
  const { q, persona = 'general' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const query = q.trim();
  const cacheKey = `search_${query.toLowerCase()}_${persona}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const scrapers = [
      searchReddit(query, 20),
      getRedditComments(query, 30),
      searchNews(query),
      getHackerNews(query),
      scrapeWikipediaSummary(query)
    ];

    if (searchInstagram) scrapers.push(searchInstagram(query, 20));
    if (searchTwitter) scrapers.push(searchTwitter(query, 25));
    if (searchYoutube) scrapers.push(searchYoutube(query, 15));

    const results = await Promise.allSettled(scrapers);

    const [redditPosts, redditComments, news, hnResults, wikiSummaryResult, instaPosts, twitterPosts, youtubePosts] = results;

    const allData = [
      ...(redditPosts.value || []),
      ...(redditComments.value || []),
      ...(news.value || []),
      ...(hnResults.value || []),
      ...(instaPosts?.value || []),
      ...(twitterPosts?.value || []),
      ...(youtubePosts?.value || [])
    ];

    const summary = await generateSummary(query, allData, persona);

    const sourceCounts = allData.reduce((acc, d) => {
      const s = d.source.replace('_comment', '');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const topPosts = (redditPosts.value || []).sort((a, b) => b.score - a.score).slice(0, 8);
    const topComments = (redditComments.value || []).sort((a, b) => b.score - a.score).slice(0, 10);
    const recentNews = (news.value || []).slice(0, 8);

    // Social media posts (Instagram + Twitter combined)
    const socialPosts = [
      ...(instaPosts?.value || []),
      ...(twitterPosts?.value || [])
    ].sort((a, b) => b.score - a.score).slice(0, 15);

    // Timeline data: group posts by day
    const timelineData = buildTimeline(allData);

    const result = {
      query,
      persona,
      summary,
      wikiSummary: wikiSummaryResult?.value || '',
      topPosts,
      topComments,
      recentNews,
      socialPosts,
      hackerNews: (hnResults.value || []).slice(0, 5),
      youtubePosts: (youtubePosts?.value || []).slice(0, 6),
      sourceCounts,
      totalDataPoints: allData.length,
      timelineData,
      fetchedAt: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('Search error:', e);
    res.status(500).json({ error: 'Failed to fetch data', message: e.message });
  }
});

function buildTimeline(data) {
  const byDay = {};
  data.forEach(d => {
    if (!d.created) return;
    const day = d.created.slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, count: 0, positive: 0, negative: 0 };
    byDay[day].count++;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}

module.exports = router;