const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateSummary(query, dataPoints) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return generateFallbackSummary(query, dataPoints);
  }

  const textSample = dataPoints
    .slice(0, 30)
    .map(d => `[${d.source}] ${d.title || ''}: ${d.text || ''}`)
    .join('\n')
    .slice(0, 3000);

  const prompt = `You are a public sentiment analyst. Analyze the following social media posts, news, and comments about "${query}" and provide:

1. **Overall Sentiment**: (Positive/Negative/Mixed/Neutral) with a score 0-100
2. **Key Themes**: Top 5 recurring themes or topics people discuss
3. **What People Love**: Specific positive aspects mentioned
4. **What People Criticize**: Specific negative aspects, complaints, concerns
5. **Trending Opinion**: The dominant public narrative right now
6. **Verdict**: One punchy paragraph conclusion

Be direct, data-driven, and unbiased. Use real insights from the data.

DATA:
${textSample}

Respond in JSON format:
{
  "sentiment": "Positive|Negative|Mixed|Neutral",
  "sentimentScore": 0-100,
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "whatPeopleLove": ["point1", "point2", "point3"],
  "whatPeopleCriticize": ["point1", "point2", "point3"],
  "trendingOpinion": "string",
  "verdict": "string",
  "dataPointsAnalyzed": ${dataPoints.length}
}`;

  try {
    const { data } = await axios.post(GROQ_URL, {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return generateFallbackSummary(query, dataPoints);
  } catch (e) {
    console.error("Groq error:", e.response?.data || e.message);
    return generateFallbackSummary(query, dataPoints);
  }
}

function generateFallbackSummary(query, dataPoints) {
  const texts = dataPoints.map(d => (d.title + ' ' + d.text).toLowerCase()).join(' ');
  const positiveWords = ['good','great','love','best','amazing','excellent','awesome','happy','recommend','positive','support','like','helpful','wonderful','fantastic'];
  const negativeWords = ['bad','worst','hate','terrible','awful','poor','problem','issue','complaint','negative','wrong','broken','fails','disappointing','scam'];
  let pos = 0, neg = 0;
  positiveWords.forEach(w => { pos += (texts.match(new RegExp(w, 'g')) || []).length; });
  negativeWords.forEach(w => { neg += (texts.match(new RegExp(w, 'g')) || []).length; });
  const total = pos + neg || 1;
  const score = Math.round((pos / total) * 100);
  const sentiment = score > 60 ? 'Positive' : score < 40 ? 'Negative' : 'Mixed';

  return {
    sentiment,
    sentimentScore: score,
    keyThemes: ['Public discussion', 'Community feedback', 'Media coverage', 'User experience', 'General opinion'],
    whatPeopleLove: ['Active community discussion', 'Wide media coverage', 'Public interest is high'],
    whatPeopleCriticize: ['Mixed opinions observed', 'Some concerns raised', 'Debate ongoing'],
    trendingOpinion: `"${query}" is generating ${sentiment.toLowerCase()} public discourse with significant engagement across platforms.`,
    verdict: `Based on ${dataPoints.length} data points, public sentiment around "${query}" is ${sentiment.toLowerCase()} (${score}/100). Add your Groq API key in backend/.env for deeper AI analysis.`,
    dataPointsAnalyzed: dataPoints.length
  };
}

module.exports = { generateSummary };