const axios = require('axios');

const HEADERS = {
  'User-Agent': 'PulseCheck/1.0 (sentiment research tool)',
  'Accept': 'application/json'
};

async function searchReddit(query, limit = 25) {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit}&t=month`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const posts = data?.data?.children || [];

    return posts.map(p => {
      const d = p.data;
      return {
        source: 'reddit',
        title: d.title,
        text: d.selftext?.slice(0, 400) || '',
        score: d.score,
        comments: d.num_comments,
        subreddit: d.subreddit,
        url: `https://reddit.com${d.permalink}`,
        created: new Date(d.created_utc * 1000).toISOString(),
        upvoteRatio: d.upvote_ratio
      };
    }).filter(p => p.title);
  } catch (e) {
    console.error('Reddit error:', e.message);
    return [];
  }
}

async function getRedditComments(query, limit = 40) {
  try {
    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&limit=5&t=month`;
    const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 8000 });
    const posts = data?.data?.children?.slice(0, 3) || [];

    const comments = [];
    for (const post of posts) {
      try {
        const commUrl = `https://www.reddit.com${post.data.permalink}.json?limit=15`;
        const { data: cd } = await axios.get(commUrl, { headers: HEADERS, timeout: 6000 });
        const comList = cd?.[1]?.data?.children || [];
        for (const c of comList) {
          if (c.data?.body && c.data.body !== '[deleted]' && c.data.body.length > 20) {
            comments.push({
              source: 'reddit_comment',
              text: c.data.body.slice(0, 300),
              score: c.data.score,
              subreddit: post.data.subreddit,
              postTitle: post.data.title
            });
          }
        }
      } catch {}
      if (comments.length >= limit) break;
    }
    return comments.slice(0, limit);
  } catch (e) {
    console.error('Reddit comments error:', e.message);
    return [];
  }
}

module.exports = { searchReddit, getRedditComments };