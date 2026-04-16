// backend/utils/twitter.js
// Public-web X/Twitter collector without official search API.
// Discovery: DuckDuckGo web search
// Enrichment: page metadata + X oEmbed for discovered post URLs
// Fallback: explicit Reddit reference items

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

function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toIsoSafe(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.hostname === 'twitter.com') u.hostname = 'x.com';
    return u.toString();
  } catch {
    return safeText(url);
  }
}

function isTwitterPostUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    return (
      (u.hostname === 'x.com' || u.hostname === 'twitter.com') &&
      /\/status\/\d+/.test(path)
    );
  } catch {
    return false;
  }
}

function parseUsernameFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] ? `@${parts[0]}` : '@user';
  } catch {
    return '@user';
  }
}

function ddgResultUrl(href) {
  if (!href) return '';
  try {
    const u = new URL(href);
    const uddg = u.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    if (u.hostname.includes('duckduckgo.com') && u.searchParams.get('uddg')) {
      return decodeURIComponent(u.searchParams.get('uddg'));
    }
    return href;
  } catch {
    return href;
  }
}

function extractMeta(html, pageUrl = '') {
  const $ = cheerio.load(html || '');
  const meta = name => $(`meta[name="${name}"]`).attr('content') || '';
  const prop = name => $(`meta[property="${name}"]`).attr('content') || '';

  const title =
    safeText(prop('og:title')) ||
    safeText(meta('twitter:title')) ||
    safeText($('title').text());

  const description =
    safeText(prop('og:description')) ||
    safeText(meta('twitter:description')) ||
    safeText(meta('description'));

  const image =
    safeText(prop('og:image')) ||
    safeText(meta('twitter:image')) ||
    safeText(meta('twitter:image:src'));

  const publishedAt =
    safeText(prop('article:published_time')) ||
    safeText(meta('article:published_time')) ||
    safeText(prop('og:updated_time'));

  const author =
    safeText(meta('author')) ||
    safeText(prop('og:site_name')) ||
    '';

  const canonical =
    safeText($('link[rel="canonical"]').attr('href')) ||
    safeText(prop('og:url')) ||
    pageUrl;

  return { title, description, image, publishedAt, author, canonical };
}

async function fetchHtml(url, timeout = 12000) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    timeout,
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 500,
  });
  return typeof data === 'string' ? data : JSON.stringify(data || '');
}

async function discoverTwitterUrls(query, limit = 25) {
  const q = `site:x.com OR site:twitter.com ${query}`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

  const html = await fetchHtml(url, 12000);
  const $ = cheerio.load(html);
  const results = [];

  $('.result__body').each((i, el) => {
    if (i >= limit) return false;

    const linkEl = $(el).find('.result__title a').first();
    const rawHref = safeText(linkEl.attr('href'));
    const resolved = normalizeUrl(ddgResultUrl(rawHref));
    const title = safeText(linkEl.text());
    const snippet = safeText($(el).find('.result__snippet').text());

    if (!resolved) return;
    if (!/x\.com|twitter\.com/i.test(resolved)) return;

    results.push({
      url: resolved,
      title,
      snippet,
    });
  });

  return uniqBy(results, x => x.url);
}

async function tryXoEmbed(url) {
  if (!isTwitterPostUrl(url)) return null;

  try {
    const embedUrl = `https://publish.x.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const { data } = await axios.get(embedUrl, {
      headers: { 'User-Agent': randomUA(), 'Accept': 'application/json' },
      timeout: 12000,
      validateStatus: status => status >= 200 && status < 500,
    });

    if (!data || typeof data !== 'object') return null;

    const $ = cheerio.load(data.html || '');
    const text = safeText($('blockquote').text())
      .replace(/\s+/g, ' ')
      .trim();

    const authorName = safeText(data.author_name) || parseUsernameFromUrl(url);
    const authorUrl = safeText(data.author_url) || '';
    const username = authorUrl ? parseUsernameFromUrl(authorUrl) : parseUsernameFromUrl(url);

    return {
      source: 'twitter',
      title: text.slice(0, 140) || safeText(data.title) || 'X post',
      text: text.slice(0, 500) || safeText(data.title) || '',
      score: Math.max(10, text.length),
      url: normalizeUrl(url),
      created: new Date().toISOString(),
      platform: 'twitter',
      likes: 0,
      retweets: 0,
      replies: 0,
      username: username || `@${authorName.replace(/^@/, '')}`,
      author_name: authorName,
      sourceType: 'x_oembed',
      raw_embed: data.html || '',
    };
  } catch {
    return null;
  }
}

async function enrichTwitterCandidate(candidate) {
  const url = normalizeUrl(candidate.url);

  let pageMeta = {};
  try {
    const html = await fetchHtml(url, 12000);
    pageMeta = extractMeta(html, url);
  } catch {
    pageMeta = {};
  }

  let oembed = null;
  try {
    oembed = await tryXoEmbed(url);
  } catch {
    oembed = null;
  }

  const title =
    safeText(oembed?.title) ||
    safeText(pageMeta.title) ||
    safeText(candidate.title) ||
    'X post';

  const text =
    safeText(oembed?.text) ||
    safeText(pageMeta.description) ||
    safeText(candidate.snippet) ||
    title;

  return {
    source: 'twitter',
    title: title.slice(0, 140),
    text: text.slice(0, 500),
    score: Math.max(
      1,
      text.length +
        (candidate.snippet ? candidate.snippet.length : 0) +
        (pageMeta.image ? 15 : 0)
    ),
    url,
    created: pageMeta.publishedAt ? toIsoSafe(pageMeta.publishedAt) : new Date().toISOString(),
    platform: 'twitter',
    likes: 0,
    retweets: 0,
    replies: 0,
    username: oembed?.username || parseUsernameFromUrl(url),
    author_name: oembed?.author_name || pageMeta.author || '',
    image: pageMeta.image || '',
    sourceType: oembed?.sourceType || (pageMeta.title ? 'page_metadata' : 'search_snippet'),
    snippet: candidate.snippet || '',
    canonical: pageMeta.canonical || url,
  };
}

function redditReferenceItem(post, query) {
  const title = safeText(post?.data?.title);
  const permalink = safeText(post?.data?.permalink);
  const externalUrl = safeText(post?.data?.url);
  const redditUrl = permalink ? `https://www.reddit.com${permalink}` : externalUrl;

  return {
    source: 'reddit_reference',
    title: title.slice(0, 140),
    text: `[Reddit reference for Twitter] ${title}`.slice(0, 500),
    score: Math.max(1, Math.floor((post?.data?.score || 0) / 5)),
    url: redditUrl || `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
    created: toIsoSafe(post?.data?.created_utc ? post.data.created_utc * 1000 : undefined),
    platform: 'twitter',
    likes: Math.floor((post?.data?.score || 0) / 20),
    retweets: 0,
    replies: post?.data?.num_comments || 0,
    username: '@reddit_reference',
    reference_platform: 'twitter',
    synthetic: true,
    sourceType: 'reference',
  };
}

async function syntheticTwitterFromReddit(query, limit = 10) {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' twitter')}&sort=relevance&limit=10&t=month`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'PulseCheck/1.0' },
      timeout: 8000,
      validateStatus: status => status >= 200 && status < 500,
    });

    return (data?.data?.children || [])
      .slice(0, limit)
      .map(p => redditReferenceItem(p, query))
      .filter(p => p.title.length > 5);
  } catch {
    return [];
  }
}

async function searchTwitter(query, limit = 20) {
  const discovered = await discoverTwitterUrls(query, Math.max(limit * 3, 20));

  const enriched = [];
  for (const candidate of discovered) {
    try {
      const item = await enrichTwitterCandidate(candidate);
      if (item && item.title) enriched.push(item);
      if (enriched.length >= limit) break;
    } catch {
      // keep going
    }
  }

  if (enriched.length > 0) {
    return uniqBy(enriched, x => x.url).slice(0, limit);
  }

  const reddit = await syntheticTwitterFromReddit(query, limit);
  return uniqBy(reddit, x => x.url).slice(0, limit);
}

module.exports = { searchTwitter };