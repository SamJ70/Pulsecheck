// backend/utils/youtube.js
// YouTube Data API v3 — free tier: 10,000 units/day
// Get key free at: https://console.cloud.google.com/

const axios = require('axios');

async function searchYoutube(query, limit = 15) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'your_youtube_key_here') return [];

  try {
    // Step 1: find top videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&order=relevance&key=${apiKey}`;
    const { data: searchData } = await axios.get(searchUrl, { timeout: 8000 });
    const videoIds = (searchData.items || []).map(v => v.id.videoId).filter(Boolean);

    if (!videoIds.length) return [];

    // Step 2: get comments from top videos
    const comments = [];
    for (const videoId of videoIds.slice(0, 2)) {
      try {
        const commUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=10&order=relevance&key=${apiKey}`;
        const { data: commData } = await axios.get(commUrl, { timeout: 6000 });
        
        for (const item of (commData.items || [])) {
          const c = item.snippet.topLevelComment.snippet;
          if (c.textDisplay && c.textDisplay.length > 20) {
            comments.push({
              source: 'youtube',
              title: c.textDisplay.slice(0, 120),
              text: c.textDisplay.slice(0, 400),
              score: c.likeCount || 0,
              url: `https://youtube.com/watch?v=${videoId}`,
              created: c.publishedAt,
              platform: 'youtube',
              likes: c.likeCount || 0
            });
          }
        }
      } catch {}
    }

    return comments.slice(0, limit);
  } catch (e) {
    console.error('YouTube error:', e.message);
    return [];
  }
}

module.exports = { searchYoutube };