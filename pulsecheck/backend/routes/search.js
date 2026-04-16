// backend/routes/search.js — FULL REPLACEMENT (v2 with hot takes + opinion battle)
const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { searchReddit, getRedditComments } = require('../utils/reddit');
const { searchNews } = require('../utils/news');
const { getHackerNews, scrapeWikipediaSummary } = require('../utils/trends');
const { generateSummary } = require('../utils/groq');
const { extractHotTakes, buildOpinionBattle, buildStatCards, extractTrendingPhrases } = require('../utils/hottakes');

// Lazy-load scrapers
let searchInstagram, searchTwitter, searchYoutube;
try { ({ searchInstagram } = require('../utils/instagram')); } catch (e) { console.warn('Instagram module missing:', e.message); }
try { ({ searchTwitter } = require('../utils/twitter')); } catch (e) { console.warn('Twitter module missing:', e.message); }
try { ({ searchYoutube } = require('../utils/youtube')); } catch (e) { console.warn('YouTube module missing:', e.message); }

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
    // Build scraper array
    const scrapers = [
      searchReddit(query, 20),
      getRedditComments(query, 30),
      searchNews(query),
      getHackerNews(query),
      scrapeWikipediaSummary(query),
    ];

    if (searchInstagram) scrapers.push(searchInstagram(query, 20));
    else scrapers.push(Promise.resolve([]));

    if (searchTwitter) scrapers.push(searchTwitter(query, 25));
    else scrapers.push(Promise.resolve([]));

    if (searchYoutube) scrapers.push(searchYoutube(query, 15));
    else scrapers.push(Promise.resolve([]));

    const results = await Promise.allSettled(scrapers);

    const [
      redditPostsR,
      redditCommentsR,
      newsR,
      hnR,
      wikiR,
      instaR,
      twitterR,
      youtubeR,
    ] = results;

    const safeVal = (r) => (r?.status === 'fulfilled' ? r.value : null);

    const redditPosts   = safeVal(redditPostsR) || [];
    const redditComments = safeVal(redditCommentsR) || [];
    const news          = safeVal(newsR) || [];
    const hnResults     = safeVal(hnR) || [];
    const wikiSummary   = safeVal(wikiR) || '';
    const instaPosts    = safeVal(instaR) || [];
    const twitterPosts  = safeVal(twitterR) || [];
    const youtubePosts  = safeVal(youtubeR) || [];

    // All data combined for analysis
    const allData = [
      ...redditPosts,
      ...redditComments,
      ...news,
      ...hnResults,
      ...instaPosts,
      ...twitterPosts,
      ...youtubePosts,
    ];

    // AI summary
    const summary = await generateSummary(query, allData, persona);

    // Source counts
    const sourceCounts = allData.reduce((acc, d) => {
      const s = d.source.replace('_comment', '');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const topPosts    = [...redditPosts].sort((a, b) => b.score - a.score).slice(0, 8);
    const topComments = [...redditComments].sort((a, b) => b.score - a.score).slice(0, 12);
    const recentNews  = [...news].slice(0, 8);

    const socialPosts = [...instaPosts, ...twitterPosts]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const timelineData = buildTimeline(allData);

    // ── NEW addictive features ──────────────────────────────────────────────
    const hotTakes = extractHotTakes([...redditComments, ...twitterPosts, ...redditPosts], 8);

    const partialResult = {
      query, persona, summary, wikiSummary,
      topPosts, topComments, recentNews, socialPosts,
      hackerNews: hnResults.slice(0, 5),
      youtubePosts: youtubePosts.slice(0, 6),
      sourceCounts,
      totalDataPoints: allData.length,
      timelineData,
    };

    const opinionBattle = buildOpinionBattle(allData);
    const statCards     = buildStatCards({ ...partialResult });
    const trendingPhrases = extractTrendingPhrases(allData, 12);

    const result = {
      ...partialResult,
      hotTakes,
      opinionBattle,
      statCards,
      trendingPhrases,
      fetchedAt: new Date().toISOString(),
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
    if (!byDay[day]) byDay[day] = { date: day, count: 0 };
    byDay[day].count++;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}

module.exports = router;