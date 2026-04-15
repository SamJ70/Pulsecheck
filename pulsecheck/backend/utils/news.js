const RSSParser = require('rss-parser');
const parser = new RSSParser({ timeout: 8000 });

const RSS_FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
  'https://www.thehindu.com/news/feeder/default.rss',
  'https://indianexpress.com/feed/',
  'https://www.ndtv.com/rss/top-stories',
  'https://feeds.feedburner.com/ndtvnews-india-news'
];

async function searchNews(query) {
  const q = query.toLowerCase();
  const results = [];
  const promises = RSS_FEEDS.map(async (feedUrl) => {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const text = ((item.title || '') + ' ' + (item.contentSnippet || '')).toLowerCase();
        if (q.split(' ').some(w => w.length > 3 && text.includes(w))) {
          results.push({
            source: 'news',
            title: item.title,
            text: item.contentSnippet?.slice(0, 300) || '',
            url: item.link,
            created: item.pubDate,
            feedSource: feed.title || feedUrl
          });
        }
      }
    } catch {}
  });

  await Promise.allSettled(promises);
  return results.slice(0, 20);
}

async function getTrendingNews() {
  const results = [];
  const promises = RSS_FEEDS.slice(0, 4).map(async (feedUrl) => {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, 5).map(item => ({
        source: 'news',
        title: item.title,
        text: item.contentSnippet?.slice(0, 200) || '',
        url: item.link,
        created: item.pubDate,
        feedSource: feed.title || 'News'
      }));
      results.push(...items);
    } catch {}
  });
  await Promise.allSettled(promises);
  return results;
}

module.exports = { searchNews, getTrendingNews };