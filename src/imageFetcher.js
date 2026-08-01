import https from 'https';

/**
 * Multi-Image Generator & Fetcher for Articles.
 * Provides 3 distinct HD images per article (1 Hero Banner + 2 In-Article Section Visuals).
 * Combines exact matching photography with Pollinations AI Image Generation!
 * @param {string} topicQuery 
 * @returns {Promise<{ hero: { url: string, credit: string }, inline1: { url: string, credit: string }, inline2: { url: string, credit: string } }>}
 */
export async function getArticleImages(topicQuery) {
  const cleanPrompt = topicQuery.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const seed1 = Math.floor(Math.random() * 900000) + 100000;
  const seed2 = Math.floor(Math.random() * 900000) + 100000;
  const seed3 = Math.floor(Math.random() * 900000) + 100000;

  // AI Prompt 1: Main Hero Concept
  const aiHeroUrl = `https://image.pollinations.ai/prompt/professional%20editorial%20photography%20of%20${encodeURIComponent(cleanPrompt)}?width=1200&height=675&nologo=true&seed=${seed1}`;
  
  // AI Prompt 2: Detailed Workflow Concept
  const aiInline1Url = `https://image.pollinations.ai/prompt/detailed%20infographic%20diagram%20modern%20visual%20of%20${encodeURIComponent(cleanPrompt)}?width=1000&height=560&nologo=true&seed=${seed2}`;
  
  // AI Prompt 3: Real World Practice Concept
  const aiInline2Url = `https://image.pollinations.ai/prompt/real%20world%20workspace%20practical%20application%20of%20${encodeURIComponent(cleanPrompt)}?width=1000&height=560&nologo=true&seed=${seed3}`;

  // Unsplash Curated High-Res Fallbacks
  const unsplashPool = [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
  ];

  const heroOk = await checkUrlWorking(aiHeroUrl);
  const inline1Ok = await checkUrlWorking(aiInline1Url);
  const inline2Ok = await checkUrlWorking(aiInline2Url);

  return {
    hero: {
      url: heroOk ? aiHeroUrl : unsplashPool[0],
      credit: heroOk ? 'AI Custom Visual Engine' : 'Unsplash Photography'
    },
    inline1: {
      url: inline1Ok ? aiInline1Url : unsplashPool[1],
      credit: inline1Ok ? 'AI Infographic Engine' : 'High-Res Tech Stock'
    },
    inline2: {
      url: inline2Ok ? aiInline2Url : unsplashPool[2],
      credit: inline2Ok ? 'AI Application Renderer' : 'Editorial News Stock'
    }
  };
}

function checkUrlWorking(urlStr) {
  return new Promise((resolve) => {
    https.get(urlStr, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on('error', () => resolve(false));
  });
}
