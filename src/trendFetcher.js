import { callSerperWithFailover } from './serperManager.js';
import https from 'https';

/**
 * High eCPM Tier-1 Real News & Trends Fetcher.
 * Automatically targets US/UK/Canada High eCPM Categories: AI Tech, Finance/Markets, EVs & Energy!
 * @returns {Promise<Array<{ title: string, category: string, snippet: string, source: string, date: string, link: string }>>}
 */
export async function getTrendingTopics() {
  console.log(' 🌐 Scanning Worldwide Global Breaking News & Trends...');

  // Multi-Region Rotation: 60% Global Worldwide Viral, 30% US/Tier-1 High eCPM, 10% India
  const roll = Math.random();
  let mode = 'global';
  let targetGl = 'us'; // Default global search filter

  if (roll < 0.60) {
    mode = 'global';
    targetGl = 'us'; // Global US-wire indexed news
  } else if (roll < 0.90) {
    mode = 'us_high_ecpm';
    targetGl = 'us';
  } else {
    mode = 'india';
    targetGl = 'in';
  }

  // 1. High-Search-Volume & High-CPC Enterprise AI & Cloud Queries ($15 - $35 CPC)
  const globalViralQueries = [
    'OpenAI ChatGPT Google Gemini enterprise AI data center infrastructure 2026',
    'NVIDIA Blackwell AI GPU server demand cloud computing earnings',
    'Cybersecurity zero-day vulnerability cloud security enterprise defense news',
    'Quantum computing breakthrough semiconductor 2nm manufacturing innovation',
    'Wall Street S&P 500 tech rally Federal Reserve interest rate forecast',
    'DeepSeek open source LLM benchmark cloud deployment cost optimization'
  ];

  // 2. Ultra-High eCPM FinTech, SaaS & CleanTech Queries ($20 - $50 CPC)
  const highEcpmQueries = [
    'AI chips NVIDIA Microsoft Azure AWS cloud data center billion investment 2026',
    'Enterprise cybersecurity ransomware mitigation zero trust architecture',
    'Federal Reserve monetary policy global financial market liquidity bond yields',
    'Solid-state battery commercial breakthrough EV range energy density parity',
    'FinTech digital payment infrastructure blockchain wholesale settlement banking',
    'SaaS AI agent workflow automation enterprise cost reduction case study'
  ];

  // 3. High-Growth Emerging Tech & Economy Queries
  const indiaQueries = [
    'India semiconductor fabrication plant Tata micron chip manufacturing 2026',
    'Sensex Nifty market capitalisation foreign institutional investment RBI report',
    'India AI startup funding venture capital enterprise SaaS expansion',
    'ISRO commercial satellite launch space economy revenue roadmap',
    'Digital public infrastructure UPI global adoption cross-border fintech'
  ];

  let queriesList = globalViralQueries;
  if (mode === 'us_high_ecpm') queriesList = highEcpmQueries;
  if (mode === 'india') queriesList = indiaQueries;

  const targetQuery = queriesList[Math.floor(Math.random() * queriesList.length)];

  console.log(` 🌐 [Global Trend Engine] Active Mode: ${mode.toUpperCase()} | Query: "${targetQuery}"`);

  // Step 1: Query Serper Google News API
  try {
    const serperData = await callSerperWithFailover('/news', { 
      q: targetQuery, 
      gl: targetGl,
      hl: 'en',
      num: 12 
    });

    if (serperData && serperData.news && serperData.news.length > 0) {
      console.log(`   ✅ Fetched ${serperData.news.length} Worldwide Live Google News Stories!`);

      const cleanStories = serperData.news
        .map(item => {
          const cleanedTitle = cleanTitleString(item.title);
          return {
            title: cleanedTitle,
            category: mode === 'india' ? 'India News & Trends' : getCategoryFromTitle(cleanedTitle),
            snippet: item.snippet || `Global breaking coverage provided by ${item.source || 'leading news agency'}.`,
            source: item.source || 'Global News Wire',
            date: item.date || 'Just now',
            link: item.link || '#'
          };
        })
        .filter(item => isValidNewsTitle(item.title));

      if (cleanStories.length > 0) {
        return cleanStories;
      }
    }
  } catch (e) {
    console.warn('⚠️ Serper API fallback:', e.message);
  }

  // Step 2: Fallback to Live Google Trends & Google News Realtime RSS Feeds
  return fetchGoogleTrendsRealtime(targetGl.toUpperCase());
}

/**
 * Fetches comprehensive full-story background facts & excerpts via Serper Web Search
 */
export async function fetchFullStoryDetails(title, source = '') {
  try {
    console.log(` 🔎 Fetching Full Story Context & Background Facts for: "${title}"...`);
    const searchData = await callSerperWithFailover('/search', {
      q: `"${title}" ${source} news details breakdown facts`,
      gl: 'us',
      hl: 'en',
      num: 5
    });

    if (searchData && searchData.organic && searchData.organic.length > 0) {
      const fullContextParagraphs = searchData.organic
        .map(item => item.snippet)
        .filter(Boolean)
        .join('\n\n');

      console.log(`   ✅ Extracted ${fullContextParagraphs.length} characters of Raw Story Context!`);
      return fullContextParagraphs;
    }
  } catch (e) {
    console.warn('⚠️ Full story fetch fallback:', e.message);
  }

  return '';
}

/**
 * Sanitizes and cleans raw news headline string WITHOUT chopping hyphenated words
 */
function cleanTitleString(rawTitle) {
  if (!rawTitle) return '';
  let t = rawTitle.trim();

  // Strip publisher trailing suffixes ONLY when surrounded by spaces (e.g. " - Reuters", " | BBC News")
  // Never match hyphens inside compound words like "All-Time", "High-Tech", "self-driving", "Sub-2nm"!
  t = t.replace(/\s+[-|–—]\s+[A-Za-z0-9\s.&']+$/, '');

  // Strip trailing truncation ellipsis like "..." or "…"
  t = t.replace(/\s*(?:\.\.\.|…)\s*$/i, '');

  // Strip prefix labels like "Live Updates:" or "Breaking News:"
  t = t.replace(/^(?:School Assembly News Headlines|Top News Headlines|Live Updates|Breaking News|\w+ \d{1,2}, \d{4}):\s*/i, '');

  return t.trim();
}

/**
 * Filters out low-quality roundup / assembly / truncated news titles
 */
function isValidNewsTitle(title) {
  if (!title || title.length < 28) return false;
  const lower = title.toLowerCase();

  // Reject generic roundup / assembly / briefing headlines
  if (lower.includes('school assembly') || lower.includes('top headlines today') || lower.includes('news roundup') || lower.includes('top 10 news')) {
    return false;
  }

  // Reject titles ending abruptly with a dangling preposition, article, or hyphen prefix
  if (/\b(?:the|a|an|for|to|in|on|with|by|from|of|and|or|at|as|into|self|sub|anti|non|pre|post|multi|inter|bi|contr)\s*$/i.test(title)) {
    return false;
  }

  // Reject titles ending abruptly with a single lowercase letter
  if (/\s[a-z]\s*$/.test(title)) return false;

  return true;
}

function getCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  if (lower.includes('politic') || lower.includes('election') || lower.includes('president') || lower.includes('white house') || lower.includes('congress') || lower.includes('senate') || lower.includes('government') || lower.includes('biden') || lower.includes('trump')) return 'Politics & World Affairs';
  if (lower.includes('india') || lower.includes('isro') || lower.includes('sensex') || lower.includes('nifty') || lower.includes('bollywood')) return 'India News & Trends';
  if (lower.includes('space') || lower.includes('spacex') || lower.includes('nasa') || lower.includes('moon') || lower.includes('mars') || lower.includes('orbit')) return 'Space & Cosmos';
  if (lower.includes('movie') || lower.includes('box office') || lower.includes('film') || lower.includes('hollywood') || lower.includes('netflix') || lower.includes('marvel')) return 'Movies & Entertainment';
  if (lower.includes('musk') || lower.includes('bezos') || lower.includes('zuckerberg') || lower.includes('billionaire') || lower.includes('wealth') || lower.includes('net worth')) return 'Billionaires & Business Moguls';
  if (lower.includes('tech') || lower.includes('ai') || lower.includes('chip') || lower.includes('nvidia') || lower.includes('apple') || lower.includes('google')) return 'AI & Next-Gen Tech';
  if (lower.includes('market') || lower.includes('stock') || lower.includes('business') || lower.includes('crypto') || lower.includes('wall street')) return 'Business & Markets';
  if (lower.includes('ev') || lower.includes('tesla') || lower.includes('solar') || lower.includes('energy')) return 'Clean Energy & EVs';
  return 'World Breaking News';
}

/**
 * Real-Time Google Trends & Google News RSS Feed Parser
 */
export function fetchGoogleTrendsRealtime(geo = 'US') {
  return new Promise((resolve) => {
    const urls = [
      `https://trends.google.com/trending/rss?geo=${geo}`,
      'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', // World Breaking
      'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', // Tech & AI
      'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en'  // Business & Markets
    ];
    const targetUrl = urls[Math.floor(Math.random() * urls.length)];

    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      let xml = '';
      res.on('data', chunk => xml += chunk);
      res.on('end', () => {
        const items = [];
        // Match both standard title and Google Trends news item titles
        const regex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          const rawTitle = cleanTitleString(match[1]);
          if (isValidNewsTitle(rawTitle) && !rawTitle.toLowerCase().includes('google news') && !rawTitle.toLowerCase().includes('daily search trends') && items.length < 12) {
            items.push({
              title: rawTitle,
              category: getCategoryFromTitle(rawTitle),
              snippet: `Real-time trending news reporting on ${rawTitle}.`,
              source: 'Google Trends & Wire',
              date: 'Trending Now',
              link: '#'
            });
          }
        }
        resolve(items.length > 0 ? items : getUsTier1RssNewsFallback());
      });
    }).on('error', () => resolve(getUsTier1RssNewsFallback()));
  });
}

function getUsTier1RssNewsFallback() {
  return [
    {
      title: 'OpenAI and Google Unveil Next-Gen Autonomous AI Models for 2026',
      category: 'AI & Next-Gen Tech',
      snippet: 'Major breakthrough in self-reasoning AI and multi-agent systems.',
      source: 'Wall Street Tech Desk',
      date: 'Today',
      link: '#'
    },
    {
      title: 'SpaceX Starship Prepares for Orbital Heavy Launch with NASA Moon Landers',
      category: 'Space & Cosmos',
      snippet: 'Next-generation orbital spacecraft flight milestones and payload tests.',
      source: 'Aerospace Wire',
      date: 'Today',
      link: '#'
    }
  ];
}
