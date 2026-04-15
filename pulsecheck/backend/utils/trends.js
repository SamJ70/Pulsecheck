const axios = require('axios');
const cheerio = require('cheerio');

async function getGoogleTrends(geo = 'IN') {
  try {
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(data, { xmlMode: true });
    const trends = [];
    $('item').each((i, el) => {
      trends.push({
        title: $(el).find('title').first().text(),
        traffic: $(el).find('ht\\:approx_traffic').text() || '',
        source: 'google_trends'
      });
    });
    return trends.slice(0, 20);
  } catch (e) {
    console.error('Google Trends error:', e.message);
    return [];
  }
}

async function getHackerNews(query) {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
    const { data } = await axios.get(url, { timeout: 6000 });
    return (data.hits || []).map(h => ({
      source: 'hackernews',
      title: h.title,
      text: '',
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: h.points,
      comments: h.num_comments,
      created: h.created_at
    }));
  } catch (e) {
    return [];
  }
}

async function scrapeWikipediaSummary(query) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    return data.extract || '';
  } catch {
    return '';
  }
}

module.exports = { getGoogleTrends, getHackerNews, scrapeWikipediaSummary };