const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { getGoogleTrends } = require('../utils/trends');
const { getTrendingNews } = require('../utils/news');
const { searchReddit } = require('../utils/reddit');

const cache = new NodeCache({ stdTTL: 900 }); // 15 min

router.get('/', async (req, res) => {
  const cached = cache.get('trending');
  if (cached) return res.json({ ...cached, cached: true });

  const [trends, news, indiaReddit, worldReddit] = await Promise.allSettled([
    getGoogleTrends('IN'),
    getTrendingNews(),
    searchReddit('India', 10),
    searchReddit('trending today', 8)
  ]);

  const result = {
    googleTrends: (trends.value || []).slice(0, 15),
    news: (news.value || []).slice(0, 15),
    redditIndia: (indiaReddit.value || []).sort((a,b)=>b.score-a.score).slice(0,8),
    redditWorld: (worldReddit.value || []).sort((a,b)=>b.score-a.score).slice(0,8),
    fetchedAt: new Date().toISOString()
  };

  cache.set('trending', result);
  res.json(result);
});

module.exports = router;