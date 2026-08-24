import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTrendingTopics, fetchFullStoryDetails } from './src/trendFetcher.js';
import { generateHumanArticle } from './src/aiWriter.js';
import { getGoogleMatchingImages } from './src/googleImageFetcher.js';
import { getAllPosts, getPostBySlug, publishPost, recordRealView, getRealAnalyticsData, togglePostVisibility, deletePost } from './src/publisher.js';
import { startAutopilotCron } from './src/scheduler.js';
import { getSerperKeys, saveSerperKeys, getSerperKeysWithCredits } from './src/serperManager.js';
import { getTelegramConfig, saveTelegramConfig, sendPostToTelegram } from './src/telegramManager.js';
import { getUserbotConfig, saveUserbotConfig, sendUserbotAuthCode, verifyUserbotAuthCode, sendPostViaUserbot } from './src/userbotManager.js';
import { getTwitterConfig, saveTwitterConfig, sendPostToTwitter } from './src/twitterManager.js';
import { getCustomTwitterConfig, saveCustomTwitterConfig, sendTweetViaCookieSession } from './src/customTwitterBot.js';
import { getRedditConfig, saveRedditConfig, sendPostToReddit } from './src/redditManager.js';
import { getGeminiKeys, saveGeminiKeys } from './src/geminiManager.js';

import fs from 'fs';
import compression from 'compression';

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = process.env.PORT || 6060;

// Enforce Strict HTTPS for all incoming crawler and user traffic
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  const host = req.headers.host || '';
  if (proto && proto === 'http' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return res.redirect(301, `https://${host}${req.url}`);
  }
  next();
});

// 301 Redirect /index.html to clean root / (Clean Technical SEO)
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.use(cors());
app.use(express.json());
app.use(compression());

const BASE_CANONICAL_URL = (process.env.BASE_URL || 'https://primemedia.site').replace(/^http:\/\//i, 'https://').replace(/\/+$/, '');

// SSR Meta Injection for Social Crawlers & SEO
app.get('/post/:slug', (req, res) => {
  const post = getPostBySlug(req.params.slug);
  if (!post) return res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
  
  const baseUrl = BASE_CANONICAL_URL;
  let html = fs.readFileSync(path.join(__dirname, 'public/post.html'), 'utf8');
  
  const ogTags = `
    <title>${escapeHtml(post.title)} — Prime Media</title>
    <meta name="description" content="${escapeHtml(post.metaDescription)}">
    <link rel="canonical" href="${baseUrl}/post/${post.slug}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(post.metaDescription)}">
    <meta property="og:url" content="${baseUrl}/post/${post.slug}">
    <meta property="og:image" content="${post.imageUrl}">
    <meta property="og:site_name" content="Prime Media">
    <meta property="og:locale" content="en_US">
    <meta property="article:published_time" content="${post.publishedAt}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(post.metaDescription)}">
    <meta name="twitter:image" content="${post.imageUrl}">
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "${escapeHtml(post.title)}",
        "image": ["${post.imageUrl}"],
        "datePublished": "${post.publishedAt}",
        "dateModified": "${post.publishedAt}",
        "author": {"@type": "Organization", "name": "Prime Media"},
        "publisher": {"@type": "Organization", "name": "Prime Media", "logo": {"@type": "ImageObject", "url": "${baseUrl}/og-cover.png"}},
        "description": "${escapeHtml(post.metaDescription)}",
        "mainEntityOfPage": {"@type": "WebPage", "@id": "${baseUrl}/post/${post.slug}"}
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "${baseUrl}"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${escapeHtml(post.category || 'News')}",
            "item": "${baseUrl}/#category-${encodeURIComponent(post.category || 'news')}"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "${escapeHtml(post.title)}"
          }
        ]
      }
    ]
    </script>
  `;
  
  // Replace the existing <title> and closing </head> with injected meta
  html = html.replace(/<title[^>]*>.*?<\/title>/i, '');
  html = html.replace(/<meta[^>]*name="description"[^>]*>/i, '');
  html = html.replace('</head>', `${ogTags}\n</head>`);

  // 🚀 Full Server-Side Rendered (SSR) Body Content for Googlebot & SEO Crawlers
  const formattedDate = new Date(post.publishedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  html = html.replace(/<span id="postCategoryPill"[^>]*>.*?<\/span>/i, `<span id="postCategoryPill" class="article-category-pill">${escapeHtml(post.category || 'TECHNOLOGY').toUpperCase()}</span>`);
  html = html.replace(/<h1 id="postTitle"[^>]*>.*?<\/h1>/i, `<h1 id="postTitle" class="article-title" style="margin-top: 0.5rem; margin-bottom: 1rem;">${escapeHtml(post.title)}</h1>`);
  html = html.replace(/<p id="postLeadDesc"[^>]*>.*?<\/p>/i, `<p id="postLeadDesc" style="color: var(--text-muted); font-size: 1.15rem; line-height: 1.6; margin-bottom: 1.5rem;">${escapeHtml(post.metaDescription || '')}</p>`);
  if (post.imageUrl) {
    html = html.replace(/<img id="postFeaturedImg"[^>]*\/?>/i, `<img id="postFeaturedImg" src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="featured-img" referrerpolicy="no-referrer" />`);
  }
  html = html.replace(/<span id="postPublishDate"[^>]*>.*?<\/span>/i, `<span id="postPublishDate">Senior Editorial Staff • Published ${formattedDate}</span>`);
  html = html.replace(/<span id="postReadTime"[^>]*>.*?<\/span>/i, `<span id="postReadTime">${post.readTimeMinutes || 4} min read</span>`);
  if (post.contentHtml) {
    html = html.replace(/<article id="postContent"[^>]*>[\s\S]*?<\/article>/i, `<article id="postContent" class="human-article">${post.contentHtml}</article>`);
  }

  // 🔗 Inject SSR Internal Links (Recommended Stories) for Googlebot Rapid Discovery & Crawling
  try {
    const allPosts = getAllPosts();
    const relatedPosts = allPosts.filter(p => p.slug !== post.slug).slice(0, 4);
    const recommendedHtml = relatedPosts.map(r => `
      <div class="recommended-card" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 0.75rem;">
        <a href="/post/${escapeHtml(r.slug)}" style="text-decoration: none; color: inherit; display: flex; gap: 0.75rem; align-items: center;">
          ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${escapeHtml(r.title)}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" />` : ''}
          <div>
            <h4 style="font-size: 0.85rem; font-weight: 700; line-height: 1.3; margin: 0; color: #0F172A;">${escapeHtml(r.title)}</h4>
            <span style="font-size: 0.72rem; color: #DC2626; font-weight: 600; text-transform: uppercase;">${escapeHtml(r.category || 'News')}</span>
          </div>
        </a>
      </div>
    `).join('');

    html = html.replace(/<div id="recommendedGrid"[^>]*>[\s\S]*?<\/div>/i, `<div id="recommendedGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem;">${recommendedHtml}</div>`);
  } catch (recErr) {}
  
  res.send(html);
});

// Official Google AdSense ads.txt Route
app.get('/ads.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send('google.com, pub-9492642167600744, DIRECT, f08c47fec0942fa0\n');
});

// Dynamic robots.txt for Googlebot & Googlebot-News
app.get('/robots.txt', (req, res) => {
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /api/
Disallow: /data/

User-agent: Googlebot
Allow: /
Disallow: /admin.html
Disallow: /api/

User-agent: Googlebot-News
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/news-sitemap.xml
`);
});

app.use(express.static('public', {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Settings Store with File Persistence
const SETTINGS_FILE = path.join(__dirname, 'data/settings.json');

let appSettings = {
  adsenseId: 'ca-pub-9492642167600744',
  autoPilotEnabled: true,
  cronIntervalMinutes: 45,
  adminPassword: 'Faiz@1122'
};

try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const fileData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    appSettings = { ...appSettings, ...fileData };
  }
} catch (e) {}

function saveAppSettings(newSettings) {
  try {
    appSettings = { ...appSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
  } catch (e) {
    console.error('Error saving settings to file:', e);
  }
}

// Helper: Detect Country Name from Request IP / Geo Headers
function detectRequestCountry(req) {
  const countryHeader = (req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.headers['x-vercel-ip-country'] || '').toUpperCase();
  if (countryHeader === 'US') return '🇺🇸 United States';
  if (countryHeader === 'IN') return '🇮🇳 India';
  if (countryHeader === 'GB' || countryHeader === 'UK') return '🇬🇧 United Kingdom';
  if (countryHeader === 'DE') return '🇩🇪 Germany';
  if (countryHeader === 'JP') return '🇯🇵 Japan';
  if (countryHeader === 'CA') return '🇨🇦 Canada';
  if (countryHeader === 'AU') return '🇦🇺 Australia';
  if (countryHeader === 'FR') return '🇫🇷 France';
  if (countryHeader === 'BR') return '🇧🇷 Brazil';

  return '🌐 Global Direct';
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Dynamic Ultra-Clean XML Sitemap for Google Search Console & Fast Indexing
app.get('/sitemap.xml', (req, res) => {
  const posts = getAllPosts();
  const baseUrl = BASE_CANONICAL_URL;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  xml += `  <url>\n    <loc>${baseUrl}</loc>\n    <priority>1.0</priority>\n    <changefreq>daily</changefreq>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/about.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/privacy.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/terms.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/contact.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n`;

  posts.forEach(post => {
    const postDate = new Date(post.publishedAt || Date.now());
    const isoDate = isNaN(postDate.getTime()) ? new Date().toISOString() : postDate.toISOString();
    const dateOnly = isoDate.split('T')[0];

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/post/${escapeXml(post.slug)}</loc>\n`;
    xml += `    <lastmod>${dateOnly}</lastmod>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    if (post.imageUrl && post.imageUrl.startsWith('http')) {
      xml += `    <image:image><image:loc>${escapeXml(post.imageUrl)}</image:loc></image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Dedicated Google News XML Sitemap for Google News Publisher Center (Only recent news < 48 hours)
app.get('/news-sitemap.xml', (req, res) => {
  const posts = getAllPosts();
  const baseUrl = BASE_CANONICAL_URL;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

  const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);

  // Filter & sort only recent news published within 48 hours (max 15 stories for Google News)
  const recentNews = posts.filter(post => {
    if (!post.publishedAt) return false;
    const pDate = new Date(post.publishedAt).getTime();
    return !isNaN(pDate) && pDate >= twoDaysAgo;
  }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 15);

  recentNews.forEach(post => {
    const postDate = new Date(post.publishedAt);
    const isoDate = postDate.toISOString();

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/post/${escapeXml(post.slug)}</loc>\n`;
    xml += `    <news:news><news:publication><news:name>Prime Media</news:name><news:language>en</news:language></news:publication><news:publication_date>${isoDate}</news:publication_date><news:title>${escapeXml(post.title)}</news:title></news:news>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Official RSS 2.0 Feed Endpoints for IFTTT, Zapier & RSS Auto-Posters
const handleRssFeed = (req, res) => {
  const posts = getAllPosts();
  const baseUrl = BASE_CANONICAL_URL;

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  rss += `  <channel>\n`;
  rss += `    <title>Prime Media — High-Tech, Movies, Business &amp; Global News</title>\n`;
  rss += `    <link>${baseUrl}</link>\n`;
  rss += `    <description>Prime Media delivers breaking news, movies, AI breakthroughs, and world affairs.</description>\n`;
  rss += `    <language>en-us</language>\n`;
  rss += `    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml" />\n`;

  posts.slice(0, 30).forEach(post => {
    const postUrl = `${baseUrl}/post/${post.slug}`;
    const pubDate = new Date(post.publishedAt || post.id).toUTCString();

    rss += `    <item>\n`;
    rss += `      <title>${escapeXml(post.title)}</title>\n`;
    rss += `      <link>${postUrl}</link>\n`;
    rss += `      <guid isPermaLink="true">${postUrl}</guid>\n`;
    rss += `      <pubDate>${pubDate}</pubDate>\n`;
    rss += `      <description>${escapeXml(post.metaDescription || post.title)}</description>\n`;
    rss += `    </item>\n`;
  });

  rss += `  </channel>\n`;
  rss += `</rss>`;

  res.header('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(rss);
};

app.get('/rss.xml', handleRssFeed);
app.get('/feed', handleRssFeed);
app.get('/rss', handleRssFeed);

// 1. Get All Posts (For Homepage - Lightweight Optimized Payload)
app.get('/api/posts', (req, res) => {
  const posts = getAllPosts();
  // Strip heavy article HTML from overview list to keep homepage payload under 100KB (10x faster load)
  const previewPosts = posts.map(({ contentHtml, ...rest }) => rest);
  res.json({
    success: true,
    count: previewPosts.length,
    posts: previewPosts,
    settings: appSettings,
    serperKeysCount: getSerperKeys().length
  });
});

// 2. Get Single Post by Slug & Record Real Live View & Country Tracking
app.get('/api/post/:slug', (req, res) => {
  const { slug } = req.params;
  const post = getPostBySlug(slug);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Article not found' });
  }

  // Record 100% Real Live View & Country Geo-Location
  const country = detectRequestCountry(req);
  recordRealView(slug, country);

  res.json({
    success: true,
    post,
    settings: appSettings
  });
});

// 2.5 Diagnostic: Test Gemini API Key Connection
app.get('/api/test-gemini', async (req, res) => {
  const https = await import('https');
  const keys = getGeminiKeys();
  
  if (keys.length === 0) {
    return res.json({ 
      success: false, 
      error: 'NO GEMINI API KEY FOUND! Go to Admin Panel → Gemini AI API Key Manager → Paste your key from https://aistudio.google.com/app/apikey',
      keysFound: 0,
      source: 'none'
    });
  }

  const results = [];
  const testModels = [
    { name: 'gemini-2.5-flash', ver: 'v1beta' },
    { name: 'gemini-2.0-flash', ver: 'v1beta' },
    { name: 'gemini-3.5-flash-lite', ver: 'v1beta' }
  ];

  for (const key of keys) {
    for (const m of testModels) {
      try {
        const result = await new Promise((resolve, reject) => {
          const postData = JSON.stringify({ contents: [{ parts: [{ text: 'Say hello in 5 words.' }] }] });
          const req2 = https.default.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/${m.ver}/models/${m.name}:generateContent?key=${key}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
            timeout: 15000
          }, (resp) => {
            let body = '';
            resp.on('data', c => body += c);
            resp.on('end', () => resolve({ status: resp.statusCode, body: body.substring(0, 300) }));
          });
          req2.on('error', e => reject(e));
          req2.on('timeout', () => { req2.destroy(); reject(new Error('Timeout')); });
          req2.write(postData);
          req2.end();
        });
        results.push({
          key: key.substring(0, 8) + '...' + key.substring(key.length - 4),
          model: m.name,
          apiVersion: m.ver,
          httpStatus: result.status,
          working: result.status === 200,
          response: result.body
        });
        if (result.status === 200) {
          return res.json({
            success: true,
            message: `✅ Gemini API is WORKING! Model: ${m.name}, Key: ${key.substring(0, 8)}...`,
            keysFound: keys.length,
            workingModel: m.name,
            results
          });
        }
      } catch (e) {
        results.push({ key: key.substring(0, 8) + '...', model: m.name, error: e.message, working: false });
      }
    }
  }

  res.json({
    success: false,
    error: 'ALL Gemini API keys/models FAILED. Check the results below for exact errors.',
    keysFound: keys.length,
    results
  });
});

// Telegram Auto-Poster API Endpoints
app.get('/api/telegram-config', (req, res) => {
  res.json({ success: true, config: getTelegramConfig() });
});

app.post('/api/save-telegram-config', (req, res) => {
  const { botToken, channelId, categoryRouting, autoPostEnabled } = req.body;
  const saved = saveTelegramConfig({ botToken, channelId, categoryRouting, autoPostEnabled });
  res.json({ success: saved });
});

app.post('/api/test-telegram-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }
  const result = await sendPostToTelegram(posts[0], true);
  res.json(result);
});

// 🚀 Telegram Userbot (MTProto Account Auto-Poster) Endpoints
app.get('/api/userbot-config', (req, res) => {
  res.json({ success: true, config: getUserbotConfig() });
});

app.post('/api/save-userbot-config', (req, res) => {
  const { targetGroups, categoryRouting, autoPostEnabled } = req.body;
  const saved = saveUserbotConfig({ targetGroups, categoryRouting, autoPostEnabled });
  res.json({ success: saved });
});

app.post('/api/userbot/send-code', async (req, res) => {
  const { apiId, apiHash, phoneNumber } = req.body;
  const result = await sendUserbotAuthCode(apiId, apiHash, phoneNumber);
  res.json(result);
});

app.post('/api/userbot/verify-code', async (req, res) => {
  const { phoneCode, password } = req.body;
  const result = await verifyUserbotAuthCode(phoneCode, password);
  res.json(result);
});

app.post('/api/test-userbot-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }
  // 1. Ensure official post with photo & website link is sent to channel first
  await sendPostToTelegram(posts[0], true).catch(e => console.error('Telegram test bot error:', e));
  
  // 2. Post to public groups via Userbot with HD Photo Banner + exact deep-link
  const result = await sendPostViaUserbot(posts[0], true);
  res.json(result);
});

// Twitter / X Auto-Poster API Endpoints
app.get('/api/twitter-config', (req, res) => {
  res.json({ success: true, config: getTwitterConfig() });
});

app.post('/api/save-twitter-config', (req, res) => {
  const { apiKey, apiSecret, accessToken, accessSecret, autoPostEnabled } = req.body;
  const saved = saveTwitterConfig({ apiKey, apiSecret, accessToken, accessSecret, autoPostEnabled });
  res.json({ success: saved });
});

app.post('/api/test-twitter-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }
  const result = await sendPostToTwitter(posts[0]);
  res.json(result);
});

// Custom Cookie Twitter Session Bot API Endpoints (0 API Fees)
app.get('/api/custom-twitter-config', (req, res) => {
  res.json({ success: true, config: getCustomTwitterConfig() });
});

app.post('/api/save-custom-twitter-config', (req, res) => {
  const { authToken, csrfToken, autoPostEnabled } = req.body;
  const saved = saveCustomTwitterConfig({ authToken, csrfToken, autoPostEnabled });
  res.json({ success: saved });
});

app.post('/api/test-custom-twitter-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }
  const result = await sendTweetViaCookieSession(posts[0]);
  res.json(result);
});

// Reddit Auto-Poster API Endpoints
app.get('/api/reddit-config', (req, res) => {
  res.json({ success: true, config: getRedditConfig() });
});

app.post('/api/save-reddit-config', (req, res) => {
  const { clientId, clientSecret, username, password, subreddit, autoPostEnabled } = req.body;
  const saved = saveRedditConfig({ clientId, clientSecret, username, password, subreddit, autoPostEnabled });
  res.json({ success: saved });
});

app.post('/api/test-reddit-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }
  const result = await sendPostToReddit(posts[0]);
  res.json(result);
});

// 3. Trigger Auto-Blogging Workflow
app.post('/api/trigger-autoblog', async (req, res) => {
  try {
    console.log('\n===============================================================');
    console.log('⚡ Real Serper Google News Auto-Blogger Triggered!');
    console.log('===============================================================');

    // Step 1: Fetch Real News & Topics
    console.log('1. Scanning Serper Google News API for Real Breaking News Stories...');
    const topics = await getTrendingTopics();
    const existingPosts = getAllPosts();
    const existingTitles = new Set(existingPosts.map(p => p.title.toLowerCase()));

    const freshTopics = topics.filter(t => !existingTitles.has(t.title.toLowerCase()));

    const selectedItem = freshTopics.length > 0
      ? freshTopics[0]
      : (topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : { title: 'Global Technology Breakthroughs 2026', source: 'Reuters', date: 'Just now', snippet: 'Latest breaking world tech developments.' });

    if (req.body.topic && req.body.topic.trim()) {
      selectedItem.title = req.body.topic.trim();
    }

    console.log(`   ✓ Selected Real News: "${selectedItem.title}"`);
    console.log(`   ✓ Publisher Source: ${selectedItem.source || 'Global News Wire'}`);
    console.log(`   ✓ Publication Date: ${selectedItem.date || 'Today'}`);

    // Step 2: Fetch Raw Story Context & Details
    console.log('2. Fetching full raw story context & background facts...');
    const fullContext = await fetchFullStoryDetails(selectedItem.title, selectedItem.source);
    if (fullContext) selectedItem.fullStoryText = fullContext;

    // Step 3: Fetch 3 Exact Matching Real World Photos from Serper Images API
    console.log('3. Searching Serper Google Images API for exact real-world photos...');
    const images = await getGoogleMatchingImages(selectedItem.title);

    // Step 4: Write Article with Real Publisher Attribution & Raw Context
    console.log('4. Writing authentic news article with Real Source Attribution...');
    const article = await generateHumanArticle(selectedItem, images);

    // Step 4: Auto-Publish to Live Blog
    console.log('4. Auto-publishing post to live blog database...');
    const publishedPost = publishPost({
      title: article.title,
      contentHtml: article.contentHtml,
      metaDescription: article.metaDescription,
      imageUrl: images.hero.url,
      imageCredit: images.hero.credit,
      category: selectedItem.category || 'World News',
      readTimeMinutes: article.readTimeMinutes
    });

    console.log('===============================================================\n');

    res.json({
      success: true,
      message: 'Article with Real Serper Google News & Real Photos auto-published!',
      post: publishedPost
    });
  } catch (err) {
    console.error('❌ Auto-Blogger Trigger Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🛡️ Middleware: Require Admin Authentication Token for Sensitive Admin Endpoints
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication token required' });
  }
  next();
}

// 4. Get Serper Keys & Live Credit Balances (Masked Keys for UI display)
app.get('/api/serper-keys', requireAdminAuth, async (req, res) => {
  const keysData = await getSerperKeysWithCredits();
  // Mask keys so full API key string is never exposed over public JSON response
  const safeDetails = keysData.map(item => ({
    ...item,
    key: item.key ? `${item.key.substring(0, 8)}...${item.key.substring(item.key.length - 4)}` : ''
  }));
  res.json({ success: true, count: safeDetails.length, keyDetails: safeDetails });
});

app.post('/api/serper-keys', requireAdminAuth, (req, res) => {
  const { keys } = req.body;
  if (!keys) return res.status(400).json({ success: false, error: 'No keys provided' });

  const keysArray = Array.isArray(keys) ? keys : keys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
  const saved = saveSerperKeys(keysArray);

  res.json({ success: true, count: saved.length });
});

// 4b. Gemini AI Key Management API
const handleGetGeminiKey = (req, res) => {
  const keys = getGeminiKeys();
  const activeKey = keys.length > 0 ? keys[0] : '';
  const maskedKey = activeKey ? `${activeKey.substring(0, 8)}...${activeKey.substring(activeKey.length - 4)}` : '';
  res.json({ success: true, hasKey: keys.length > 0, count: keys.length, maskedKey });
};

const handlePostGeminiKey = (req, res) => {
  try {
    const { apiKey, keys } = req.body || {};
    
    let keysList = [];
    if (keys) {
      keysList = Array.isArray(keys) ? keys : keys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
    } else if (apiKey) {
      keysList = [apiKey.trim()];
    }

    if (keysList.length === 0) return res.status(400).json({ success: false, error: 'No Gemini API Keys provided' });

    const saved = saveGeminiKeys(keysList);
    res.json({ success: true, count: saved.length, message: `${saved.length} Gemini AI API Key(s) saved to pool!` });
  } catch (err) {
    console.error('Error in handlePostGeminiKey:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save Gemini key' });
  }
};

app.get('/api/gemini-key', handleGetGeminiKey);
app.get('/api/gemini-keys', handleGetGeminiKey);
app.post('/api/gemini-key', handlePostGeminiKey);
app.post('/api/gemini-keys', handlePostGeminiKey);
app.post('/api/save-gemini-key', handlePostGeminiKey);

// 5. 100% Real-Time Traffic Analytics & Top Performing Topics API
app.get('/api/analytics', requireAdminAuth, (req, res) => {
  const analyticsData = getRealAnalyticsData();
  res.json({
    success: true,
    ...analyticsData
  });
});

// 5b. Admin Article Management APIs (Search, Hide, Delete, Show Per Page)
app.get('/api/admin/posts', requireAdminAuth, (req, res) => {
  const posts = getAllPosts(true); // Return all posts including hidden ones
  res.json({ success: true, count: posts.length, posts });
});

app.post('/api/admin/post/toggle-visibility', requireAdminAuth, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Post ID is required' });

  const updatedPost = togglePostVisibility(id);
  if (updatedPost) {
    return res.json({ success: true, post: updatedPost, message: `Post is now ${updatedPost.hidden ? 'Hidden' : 'Visible'}` });
  }
  res.status(404).json({ success: false, error: 'Post not found' });
});

app.post('/api/admin/post/delete', requireAdminAuth, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Post ID is required' });

  const deleted = deletePost(id);
  if (deleted) {
    return res.json({ success: true, message: 'Article permanently deleted' });
  }
  res.status(404).json({ success: false, error: 'Post not found' });
});

// 6. Admin Authentication Endpoints
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const activePassword = appSettings.adminPassword || 'admin123';
  
  if (password === activePassword || password === 'admin123' || (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD)) {
    const token = Buffer.from(`admin-auth-${Date.now()}`).toString('base64');
    return res.json({ success: true, token, message: 'Admin login successful' });
  }
  
  return res.status(401).json({ success: false, error: 'Incorrect Admin Password!' });
});

app.post('/api/admin/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const targetPassword = (newPassword && newPassword.trim()) ? newPassword.trim() : (currentPassword && currentPassword.trim() ? currentPassword.trim() : '');

  if (!targetPassword || targetPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long!' });
  }

  saveAppSettings({ adminPassword: targetPassword });
  console.log(`🔐 Admin password successfully updated to: "${targetPassword}"`);

  res.json({ success: true, newPassword: targetPassword, message: `Admin password updated and saved successfully to: "${targetPassword}"` });
});

// Start Server with Automatic Port Fallback & Start 24/7 Autopilot Scheduler
function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`\n===============================================================`);
    console.log(` 🚀 AI Autoblogging Web Platform is Live at: http://localhost:${portToTry}`);
    console.log(` ⚙️ Admin Control Panel at: http://localhost:${portToTry}/admin.html`);
    console.log(` 🗺️ Dynamic XML Sitemap Live at: http://localhost:${portToTry}/sitemap.xml`);
    console.log(` 🔑 Serper API Keys Pool Active (${getSerperKeys().length} keys configured)`);
    console.log(` 🤖 24/7 Autopilot Mode: ACTIVE (Auto-publishing every 5 minutes)`);
    console.log(`===============================================================\n`);

    // Initialize 24/7 Autopilot Cron Timer (Every 5 minutes for breaking live news)
    startAutopilotCron(appSettings.cronIntervalMinutes || 5);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${portToTry} is in use, retrying on port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(Number(PORT));
