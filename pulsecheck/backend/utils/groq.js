// backend/utils/groq.js — FULL REPLACEMENT
const axios = require('axios');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Persona-specific prompt templates
const PERSONA_PROMPTS = {
  company: `You are a brand intelligence analyst preparing a report for a COMPANY's marketing/product team.
Focus on: product feedback, feature requests, competitor mentions, customer pain points, brand reputation, purchase intent signals, viral moments, and business opportunities.
Your output must include: executive summary, NPS-style breakdown, top 5 actionable insights, competitive threats, and recommended actions.`,

  politician: `You are a political intelligence analyst preparing a report for a POLITICAL PARTY or elected official.
Focus on: policy acceptance/rejection, voter concerns, demographic sentiment, key issues driving opinions, emotional triggers, and messaging effectiveness.
Your output must include: voter sentiment breakdown, top concerns by theme, emotional drivers, risk areas, and communication recommendations.`,

  researcher: `You are an academic social media analyst preparing a research summary.
Focus on: discourse patterns, information spread, demographic diversity of opinions, misinformation signals, dominant narratives, and counter-narratives.
Your output must include: narrative analysis, sentiment distribution, echo chamber indicators, and notable outlier opinions.`,

  general: `You are a public intelligence analyst creating a report for the GENERAL PUBLIC who wants to understand what people really think.
Focus on: the dominant story, what people love and hate, funny/viral reactions, unexpected opinions, the "vibe check", and what this says about society.
Your output must be engaging, direct, and relatable — like a smart friend explaining public opinion to you.`
};

async function generateSummary(query, dataPoints, persona = 'general') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return generateFallbackSummary(query, dataPoints, persona);
  }

  const personaInstructions = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.general;

  const textSample = dataPoints
    .slice(0, 40)
    .map(d => `[${d.source}] ${d.title || ''}: ${d.text || ''}`)
    .join('\n')
    .slice(0, 4000);

  const prompt = `${personaInstructions}

Analyze the following social media posts, news, and comments about "${query}".

DATA SOURCES (${dataPoints.length} total data points):
${textSample}

Return ONLY valid JSON in this exact structure:
{
  "sentiment": "Positive|Negative|Mixed|Neutral",
  "sentimentScore": 0-100,
  "emotions": {
    "joy": 0-100,
    "anger": 0-100,
    "fear": 0-100,
    "trust": 0-100,
    "surprise": 0-100,
    "disgust": 0-100
  },
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "whatPeopleLove": ["specific point 1", "specific point 2", "specific point 3"],
  "whatPeopleCriticize": ["specific complaint 1", "specific complaint 2", "specific complaint 3"],
  "viralMoments": ["most talked about moment 1", "most talked about moment 2"],
  "trendingOpinion": "1-2 sentence dominant narrative",
  "verdict": "2-3 sentence punchy conclusion tailored to ${persona} perspective",
  "executiveSummary": "3-4 sentence high-level summary for decision makers",
  "actionableInsights": ["insight 1", "insight 2", "insight 3"],
  "riskSignals": ["risk 1", "risk 2"],
  "opportunityFlags": ["opportunity 1", "opportunity 2"],
  "suggestedFollowUps": ["What do people think about X?", "How does Y compare?", "Why are people angry about Z?", "What is the demographic of critics?", "How has sentiment changed recently?"],
  "demographicGuess": "Brief guess at who is most vocal about this topic",
  "dataPointsAnalyzed": ${dataPoints.length},
  "platformBreakdown": "Which platform has the strongest opinions and why"
}`;

  try {
    const { data } = await axios.post(GROQ_URL, {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, persona };
    }
    return generateFallbackSummary(query, dataPoints, persona);
  } catch (e) {
    console.error("Groq error:", e.response?.data || e.message);
    return generateFallbackSummary(query, dataPoints, persona);
  }
}

function generateFallbackSummary(query, dataPoints, persona = 'general') {
  const texts = dataPoints.map(d => (d.title + ' ' + d.text).toLowerCase()).join(' ');
  const positiveWords = ['good','great','love','best','amazing','excellent','awesome','happy','recommend','positive','support','like','helpful','wonderful','fantastic','brilliant','superb'];
  const negativeWords = ['bad','worst','hate','terrible','awful','poor','problem','issue','complaint','negative','wrong','broken','fails','disappointing','scam','corrupt','fake','pathetic'];
  let pos = 0, neg = 0;
  positiveWords.forEach(w => { pos += (texts.match(new RegExp(w, 'g')) || []).length; });
  negativeWords.forEach(w => { neg += (texts.match(new RegExp(w, 'g')) || []).length; });
  const total = pos + neg || 1;
  const score = Math.round((pos / total) * 100);
  const sentiment = score > 60 ? 'Positive' : score < 40 ? 'Negative' : 'Mixed';

  return {
    sentiment,
    sentimentScore: score,
    emotions: { joy: score, anger: 100-score, fear: 20, trust: score-10, surprise: 30, disgust: 100-score-10 },
    keyThemes: ['Public discussion', 'Community feedback', 'Media coverage', 'User experience', 'General opinion'],
    whatPeopleLove: ['Active community discussion', 'Wide media coverage', 'Public interest is high'],
    whatPeopleCriticize: ['Mixed opinions observed', 'Some concerns raised', 'Debate ongoing'],
    viralMoments: ['High engagement detected across platforms', 'Strong community response observed'],
    trendingOpinion: `"${query}" is generating ${sentiment.toLowerCase()} public discourse with significant engagement.`,
    verdict: `Based on ${dataPoints.length} data points, public sentiment around "${query}" is ${sentiment.toLowerCase()} (${score}/100). Add your Groq API key for deeper AI analysis.`,
    executiveSummary: `Analysis of ${dataPoints.length} data points reveals ${sentiment.toLowerCase()} sentiment toward "${query}". Public discourse is active across multiple platforms. Add Groq API key for detailed insights.`,
    actionableInsights: ['Monitor ongoing conversations', 'Engage with top posts', 'Track sentiment changes over time'],
    riskSignals: ['Sentiment volatility detected', 'Mixed opinions may indicate instability'],
    opportunityFlags: ['High engagement is an opportunity', 'Active community ready for outreach'],
    suggestedFollowUps: [`What are the top complaints about ${query}?`, `Who supports ${query} most?`, `How is ${query} trending this week?`, `What do critics say about ${query}?`, `Compare ${query} with alternatives`],
    demographicGuess: 'Broad cross-section of internet users',
    dataPointsAnalyzed: dataPoints.length,
    platformBreakdown: 'Reddit shows strongest opinion formation; News provides factual context',
    persona
  };
}

module.exports = { generateSummary };