// backend/utils/twitter.js
// Scrapes public Nitter instances (Twitter mirror) — completely free, no API key

const axios = require('axios');
const cheerio = require('cheerio');

// Public Nitter instances (use multiple for reliability)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.poast.org'
];

async function searchTwitter(query, limit = 20) {
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&f=tweets`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        timeout: 8000
      });

      const $ = cheerio.load(data);
      const tweets = [];

      $('.timeline-item').each((i, el) => {
        if (i >= limit) return false;
        const text = $(el).find('.tweet-content').text().trim();
        const stats = $(el).find('.tweet-stat');
        const likes = parseInt($(stats[2]).text().trim().replace(/[^0-9]/g, '')) || 0;
        const retweets = parseInt($(stats[1]).text().trim().replace(/[^0-9]/g, '')) || 0;
        const replies = parseInt($(stats[0]).text().trim().replace(/[^0-9]/g, '')) || 0;
        const username = $(el).find('.username').text().trim();
        const dateStr = $(el).find('.tweet-date a').attr('title') || '';

        if (text.length > 10) {
          tweets.push({
            source: 'twitter',
            title: text.slice(0, 120),
            text: text.slice(0, 400),
            score: likes + retweets * 2,
            url: instance + ($(el).find('.tweet-link').attr('href') || ''),
            created: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            platform: 'twitter',
            likes,
            retweets,
            replies,
            username
          });
        }
      });

      if (tweets.length > 0) return tweets;
    } catch (e) {
      console.error(`Nitter ${instance} failed:`, e.message);
      continue;
    }
  }
  return [];
}

module.exports = { searchTwitter };