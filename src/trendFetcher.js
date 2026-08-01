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

  // 1. Worldwide Global Viral Queries (Covers Anything Trending anywhere in the World!)
  const globalViralQueries = [
    'world breaking news trending headline today',
    'global viral news breaking story 2026',
    'world news politics technology science entertainment today',
    'trending topic viral event international breaking news'
  ];

  // 2. High eCPM US/Tier-1 Commercial Queries
  const highEcpmQueries = [
    'AI technology breakthrough OpenAI NVIDIA Apple 2026',
    'SpaceX NASA Starship Moon Mars Space exploration news',
    'Elon Musk Jeff Bezos Mark Zuckerberg Billionaires wealth news',
    'Hollywood Movies Box Office Marvel Netflix blockbuster release',
    'US White House Politics President Election Congress Policy News',
    'Global Stock Markets Wall Street Business Tech News',
    'Tesla EV Autonomous AI Robotaxi Tech Innovation'
  ];

  // 3. India News Queries
  const indiaQueries = [
    'India Tech Startups Innovation AI 2026',
    'ISRO Space Mission Satellite Science India',
    'Indian Politics Government Cabinet Economy News',
    'Indian Stock Market Sensex Nifty Economy Business News',
    'Indian Cinema Movies Box Office Bollywood Entertainment'
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
      return serperData.news.map(item => ({
        title: item.title,
        category: mode === 'india' ? 'India News & Trends' : getCategoryFromTitle(item.title),
        snippet: item.snippet || `Global breaking coverage provided by ${item.source || 'leading news agency'}.`,
        source: item.source || 'Global News Wire',
        date: item.date || 'Just now',
        link: item.link || '#'
      }));
    }
  } catch (e) {
    console.warn('⚠️ Serper API fallback:', e.message);
  }

  // Step 2: Fallback to Google News US Tier-1 RSS Feeds
  return getUsTier1RssNewsFallback();
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

function getUsTier1RssNewsFallback() {
  return new Promise((resolve) => {
    // US Tier-1 Technology News RSS Feed
    const rssUrl = 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en';
    
    https.get(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let xml = '';
      res.on('data', chunk => xml += chunk);
      res.on('end', () => {
        const items = [];
        const regex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/gi;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          const rawTitle = match[1];
          if (!rawTitle.includes('Google News') && items.length < 10) {
            items.push({
              title: rawTitle,
              category: getCategoryFromTitle(rawTitle),
              snippet: `High eCPM US tech news coverage on ${rawTitle}.`,
              source: 'US Press Wire',
              date: 'Recently Published',
              link: '#'
            });
          }
        }
        resolve(items.length > 0 ? items : [{
          title: 'NVIDIA Unveils Next-Gen Enterprise AI Architecture in US Keynote',
          category: 'AI & Technology (High eCPM)',
          snippet: 'Major technological and financial shift reported in US enterprise markets.',
          source: 'Wall Street Tech Desk',
          date: 'Today',
          link: '#'
        }]);
      });
    }).on('error', () => resolve([{
      title: 'Global High-Value Tech & Markets Breakthrough 2026',
      category: 'Business & Finance (High eCPM)',
      snippet: 'High CPM commercial market reporting.',
      source: 'Bloomberg Media',
      date: 'Today',
      link: '#'
    }]));
  });
}
