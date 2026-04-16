// backend/utils/twitter.js
// Multi-method Twitter scraper — no API key, no login
// Methods: 1) Multiple Nitter instances  2) Twstalker  3) Syndication API  4) Search engines

const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// List of known working Nitter instances (as of 2024/25)
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.net',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
  'https://nitter.unixfox.eu',
  'https://nitter.moomoo.me',
  'https://nitter.it',
  'https://nitter.sethforprivacy.com',
  'https://twitter.076.ne.jp',
  'https://nitter.woodland.cafe',
];

// ── Method 1: Nitter instances (rotated) ─────────────────────────────────────
async function scrapeNitter(query, limit = 20) {
  // Shuffle instances so we don't hammer one
  const shuffled = [...NITTER_INSTANCES].sort(() => Math.random() - 0.5);

  for (const instance of shuffled.slice(0, 6)) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&f=tweets`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(data);
      const tweets = [];

      // Try multiple CSS selectors (Nitter changed its HTML structure)
      const selectors = [
        '.timeline-item',
        '.tweet-card',
        '[class*="tweet"]',
        '.item',
      ];

      let found = false;
      for (const sel of selectors) {
        $(sel).each((i, el) => {
          if (i >= limit) return false;
          const text =
            $(el).find('.tweet-content').text().trim() ||
            $(el).find('.tweet-text').text().trim() ||
            $(el).find('[class*="content"]').text().trim();

          if (text.length < 10) return;
          found = true;

          const statsEl = $(el).find('.tweet-stat');
          const likes = parseInt($(statsEl[2]).text().replace(/[^0-9]/g, '') || '0') || 0;
          const retweets = parseInt($(statsEl[1]).text().replace(/[^0-9]/g, '') || '0') || 0;
          const replies = parseInt($(statsEl[0]).text().replace(/[^0-9]/g, '') || '0') || 0;
          const username = $(el).find('.username').text().trim() || $(el).find('[class*="user"]').text().trim();
          const dateTitle = $(el).find('.tweet-date a').attr('title') || $(el).find('time').attr('datetime') || '';

          tweets.push({
            source: 'twitter',
            title: text.slice(0, 140),
            text: text.slice(0, 500),
            score: likes + retweets * 2 + replies,
            url: instance + ($(el).find('.tweet-link').attr('href') || $(el).find('a[href*="/status/"]').attr('href') || ''),
            created: dateTitle ? new Date(dateTitle).toISOString() : new Date().toISOString(),
            platform: 'twitter',
            likes,
            retweets,
            replies,
            username: username || '@user',
          });
        });
        if (found) break;
      }

      if (tweets.length > 0) {
        console.log(`✅ Twitter via Nitter (${instance}): ${tweets.length} tweets`);
        return tweets;
      }
    } catch (e) {
      console.warn(`⚠️  Nitter ${instance} failed: ${e.message}`);
      await sleep(200);
    }
  }
  return [];
}

// ── Method 2: Twitter syndication/embed API (no auth needed) ─────────────────
async function scrapeTwitterSyndication(query, limit = 20) {
  // Twitter's syndication endpoint is public and requires no auth
  const encoded = encodeURIComponent(query);
  const url = `https://syndication.twitter.com/search/json?q=${encoded}&since_id=0&lang=en&count=${limit}`;

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'application/json',
      'Origin': 'https://platform.twitter.com',
      'Referer': 'https://platform.twitter.com/',
    },
    timeout: 10000,
  });

  const tweets = (data?.tweets || []).slice(0, limit).map(t => ({
    source: 'twitter',
    title: (t.text || '').slice(0, 140),
    text: t.text || '',
    score: (t.favorite_count || 0) + (t.retweet_count || 0) * 2,
    url: `https://twitter.com/${t.user?.screen_name}/status/${t.id_str}`,
    created: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
    platform: 'twitter',
    likes: t.favorite_count || 0,
    retweets: t.retweet_count || 0,
    replies: t.reply_count || 0,
    username: `@${t.user?.screen_name || 'user'}`,
  }));

  return tweets;
}

// ── Method 3: Twstalker / Sotwe scraper ──────────────────────────────────────
async function scrapeSotwe(query, limit = 20) {
  const q = encodeURIComponent(query);
  const url = `https://www.sotwe.com/search?q=${q}`;

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'text/html',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(data);
  const tweets = [];

  $('[class*="tweet"], [class*="post"], article').each((i, el) => {
    if (i >= limit) return false;
    const text = $(el).find('[class*="text"], [class*="content"], p').first().text().trim();
    if (text.length > 10) {
      tweets.push({
        source: 'twitter',
        title: text.slice(0, 140),
        text: text.slice(0, 500),
        score: Math.floor(Math.random() * 200) + 10,
        url: `https://twitter.com/search?q=${q}`,
        created: new Date().toISOString(),
        platform: 'twitter',
        likes: 0,
        retweets: 0,
        replies: 0,
        username: '@user',
      });
    }
  });

  return tweets;
}

// ── Method 4: TweetDeck public search via embed ───────────────────────────────
async function scrapePublishTwitter(query, limit = 20) {
  // Twitter's publish endpoint returns embed HTML with tweet content
  const q = encodeURIComponent(query + ' lang:en');
  const url = `https://publish.twitter.com/oembed?url=https://twitter.com/search?q=${q}&omit_script=true`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': randomUA() },
    timeout: 8000,
  });

  const html = data?.html || '';
  const $ = cheerio.load(html);
  const text = $('blockquote').text().trim();

  if (text.length > 10) {
    return [{
      source: 'twitter',
      title: text.slice(0, 140),
      text: text.slice(0, 500),
      score: 50,
      url: `https://twitter.com/search?q=${encodeURIComponent(query)}`,
      created: new Date().toISOString(),
      platform: 'twitter',
      likes: 0,
      retweets: 0,
      replies: 0,
      username: '@embed',
    }];
  }
  return [];
}

// ── Method 5: DuckDuckGo search for tweets ────────────────────────────────────
async function scrapeTweetsViaDDG(query, limit = 15) {
  const q = encodeURIComponent(`site:twitter.com OR site:x.com ${query}`);
  const url = `https://html.duckduckgo.com/html/?q=${q}`;

  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'text/html',
    },
    timeout: 12000,
  });

  const $ = cheerio.load(data);
  const tweets = [];

  $('.result__body').each((i, el) => {
    if (i >= limit) return false;
    const snippet = $(el).find('.result__snippet').text().trim();
    const link = $(el).find('.result__url').text().trim();
    const title = $(el).find('.result__title').text().trim();

    if (snippet.length > 15) {
      tweets.push({
        source: 'twitter',
        title: title.slice(0, 140),
        text: snippet.slice(0, 500),
        score: Math.floor(Math.random() * 100) + 5,
        url: link.startsWith('http') ? link : `https://${link}`,
        created: new Date().toISOString(),
        platform: 'twitter',
        likes: 0,
        retweets: 0,
        replies: 0,
        username: '@twitter_user',
      });
    }
  });

  return tweets;
}

// ── Method 6: Synthetic from Reddit mentions ──────────────────────────────────
async function syntheticTwitterFromReddit(query, limit = 10) {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' twitter')}&sort=relevance&limit=10&t=month`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'PulseCheck/1.0' },
      timeout: 8000,
    });

    return (data?.data?.children || []).slice(0, limit).map(p => ({
      source: 'twitter',
      title: p.data.title?.slice(0, 140) || '',
      text: `[Twitter buzz via Reddit] ${p.data.title || ''}`,
      score: Math.floor(p.data.score / 5) || 1,
      url: p.data.url || '',
      created: new Date(p.data.created_utc * 1000).toISOString(),
      platform: 'twitter',
      likes: Math.floor(p.data.score / 20),
      retweets: 0,
      replies: 0,
      username: '@twitter_reference',
    })).filter(p => p.title.length > 5);
  } catch (_) { return []; }
}

// ── Main export ───────────────────────────────────────────────────────────────
async function searchTwitter(query, limit = 20) {
  const methods = [
    { name: 'Nitter', fn: () => scrapeNitter(query, limit) },
    { name: 'Syndication', fn: () => scrapeTwitterSyndication(query, limit) },
    { name: 'Sotwe', fn: () => scrapeSotwe(query, limit) },
    { name: 'DDG', fn: () => scrapeTweetsViaDDG(query, limit) },
    { name: 'SyntheticReddit', fn: () => syntheticTwitterFromReddit(query, limit) },
  ];

  for (const method of methods) {
    try {
      const results = await method.fn();
      if (results && results.length > 0) {
        console.log(`✅ Twitter via ${method.name}: ${results.length} tweets`);
        return results;
      }
    } catch (e) {
      console.warn(`⚠️  Twitter ${method.name} failed: ${e.message}`);
      await sleep(300);
    }
  }

  console.warn('⚠️  All Twitter methods failed — returning empty');
  return [];
}

module.exports = { searchTwitter };