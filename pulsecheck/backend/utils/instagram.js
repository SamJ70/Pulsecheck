// backend/utils/instagram.js
// Public-web Instagram collector without official search API.
// Discovery: DuckDuckGo web search
// Enrichment: page metadata from discovered Instagram URLs
// Fallback: explicit Reddit reference items

const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
    return u.toString();
  } catch {
    return safeText(url);
  }
}

function isInstagramUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'instagram.com' || u.hostname.endsWith('.instagram.com');
  } catch {
    return false;
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

async function discoverInstagramUrls(query, limit = 25) {
  const tag = query.replace(/\s+/g, '').replace(/^#/, '').toLowerCase();
  const q = [
    `site:instagram.com/explore/tags/${tag}`,
    `site:instagram.com/p/ ${query}`,
    `site:instagram.com/reel/ ${query}`,
    `site:instagram.com ${query}`,
  ].join(' OR ');

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const html = await fetchHtml(url, 12000);
  const $ = cheerio.load(html);
  const results = [];

  $('.result__body').each((i, el) => {
    if (i >= limit) return false;

    const linkEl = $(el).find('.result__title a').first();
    const rawHref = safeText(linkEl.attr('href'));
    const title = safeText(linkEl.text());
    const snippet = safeText($(el).find('.result__snippet').text());

    let resolved = rawHref;
    try {
      const u = new URL(rawHref);
      const uddg = u.searchParams.get('uddg');
      if (uddg) resolved = decodeURIComponent(uddg);
    } catch {}

    resolved = normalizeUrl(resolved);

    if (!resolved) return;
    if (!/instagram\.com/i.test(resolved)) return;

    results.push({
      url: resolved,
      title,
      snippet,
    });
  });

  return uniqBy(results, x => x.url);
}

async function enrichInstagramCandidate(candidate) {
  const url = normalizeUrl(candidate.url);

  let pageMeta = {};
  try {
    const html = await fetchHtml(url, 12000);
    pageMeta = extractMeta(html, url);
  } catch {
    pageMeta = {};
  }

  const title =
    safeText(pageMeta.title) ||
    safeText(candidate.title) ||
    'Instagram post';

  const text =
    safeText(pageMeta.description) ||
    safeText(candidate.snippet) ||
    title;

  return {
    source: 'instagram',
    title: title.slice(0, 120),
    text: text.slice(0, 500),
    score: Math.max(
      1,
      text.length +
        (candidate.snippet ? candidate.snippet.length : 0) +
        (pageMeta.image ? 10 : 0)
    ),
    url,
    created: pageMeta.publishedAt ? toIsoSafe(pageMeta.publishedAt) : new Date().toISOString(),
    platform: 'instagram',
    likes: 0,
    comments: 0,
    username: candidate.url.includes('/explore/tags/')
      ? `#${candidate.url.split('/explore/tags/')[1]?.split('/')[0] || 'tag'}`
      : '@instagram_user',
    image: pageMeta.image || '',
    sourceType: pageMeta.title ? 'page_metadata' : 'search_snippet',
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
    title: title.slice(0, 120),
    text: `[Reddit reference for Instagram] ${title}`.slice(0, 500),
    score: Math.max(1, post?.data?.score || 1),
    url: redditUrl || `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
    created: toIsoSafe(post?.data?.created_utc ? post.data.created_utc * 1000 : undefined),
    platform: 'instagram',
    likes: Math.floor((post?.data?.score || 0) / 10),
    comments: post?.data?.num_comments || 0,
    username: '@reddit_reference',
    reference_platform: 'instagram',
    synthetic: true,
    sourceType: 'reference',
  };
}

async function syntheticInstaFromReddit(query, limit = 10) {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' instagram')}&sort=relevance&limit=10&t=month`;
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

async function searchInstagram(query, limit = 20) {
  const discovered = await discoverInstagramUrls(query, Math.max(limit * 3, 20));

  const enriched = [];
  for (const candidate of discovered) {
    try {
      const item = await enrichInstagramCandidate(candidate);
      if (item && item.title) enriched.push(item);
      if (enriched.length >= limit) break;
    } catch {
      // keep going
    }
  }

  if (enriched.length > 0) {
    return uniqBy(enriched, x => x.url).slice(0, limit);
  }

  const reddit = await syntheticInstaFromReddit(query, limit);
  return uniqBy(reddit, x => x.url).slice(0, limit);
}

module.exports = { searchInstagram };