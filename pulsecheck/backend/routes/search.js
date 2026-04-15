const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { searchReddit, getRedditComments } = require('../utils/reddit');
const { searchNews } = require('../utils/news');
const { getHackerNews, scrapeWikipediaSummary } = require('../utils/trends');
const { generateSummary } = require('../utils/groq');

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const query = q.trim();
  const cacheKey = `search_${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    // Run all scrapers in parallel
    const [redditPosts, redditComments, news, hnResults, wikiSummary] = await Promise.allSettled([
      searchReddit(query, 20),
      getRedditComments(query, 30),
      searchNews(query),
      getHackerNews(query),
      scrapeWikipediaSummary(query)
    ]);

    const allData = [
      ...(redditPosts.value || []),
      ...(redditComments.value || []),
      ...(news.value || []),
      ...(hnResults.value || [])
    ];

    const summary = await generateSummary(query, allData);

    // Calculate source breakdown
    const sourceCounts = allData.reduce((acc, d) => {
      const s = d.source.replace('_comment', '');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // Top reddit posts by score
    const topPosts = (redditPosts.value || [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    // Top comments
    const topComments = (redditComments.value || [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Recent news
    const recentNews = (news.value || []).slice(0, 8);

    const result = {
      query,
      summary,
      wikiSummary: wikiSummary.value || '',
      topPosts,
      topComments,
      recentNews,
      hackerNews: (hnResults.value || []).slice(0, 5),
      sourceCounts,
      totalDataPoints: allData.length,
      fetchedAt: new Date().toISOString()
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (e) {
    console.error('Search error:', e);
    res.status(500).json({ error: 'Failed to fetch data', message: e.message });
  }
});

module.exports = router;