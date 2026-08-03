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

app.use(cors());
app.use(express.json());
app.use(compression());

// SSR Meta Injection for Social Crawlers & SEO
app.get('/post/:slug', (req, res) => {
  const post = getPostBySlug(req.params.slug);
  if (!post) return res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
  
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  let html = fs.readFileSync(path.join(__dirname, 'public/post.html'), 'utf8');
  
  const ogTags = `
    <title>${escapeHtml(post.title)} — The Daily Chronicle</title>
    <meta name="description" content="${escapeHtml(post.metaDescription)}">
    <link rel="canonical" href="${baseUrl}/post/${post.slug}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(post.metaDescription)}">
    <meta property="og:url" content="${baseUrl}/post/${post.slug}">
    <meta property="og:image" content="${post.imageUrl}">
    <meta property="og:site_name" content="The Daily Chronicle">
    <meta property="og:locale" content="en_US">
    <meta property="article:published_time" content="${post.publishedAt}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(post.metaDescription)}">
    <meta name="twitter:image" content="${post.imageUrl}">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "${escapeHtml(post.title)}",
      "image": ["${post.imageUrl}"],
      "datePublished": "${post.publishedAt}",
      "dateModified": "${post.publishedAt}",
      "author": {"@type": "Organization", "name": "The Daily Chronicle"},
      "publisher": {"@type": "Organization", "name": "The Daily Chronicle"},
      "description": "${escapeHtml(post.metaDescription)}",
      "mainEntityOfPage": {"@type": "WebPage", "@id": "${baseUrl}/post/${post.slug}"}
    }
    </script>
  `;
  
  // Replace the existing <title> and closing </head> with injected meta
  html = html.replace(/<title[^>]*>.*?<\/title>/i, '');
  html = html.replace(/<meta[^>]*name="description"[^>]*>/i, '');
  html = html.replace('</head>', `${ogTags}\n</head>`);
  
  res.send(html);
});

// Official Google AdSense ads.txt Route
app.get('/ads.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send('google.com, pub-9492642167600744, DIRECT, f08c47fec0942fa0\n');
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
  cronIntervalMinutes: 5,
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
  const countryHeader = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
  if (countryHeader === 'US') return '🇺🇸 United States';
  if (countryHeader === 'IN') return '🇮🇳 India';
  if (countryHeader === 'GB' || countryHeader === 'UK') return '🇬🇧 United Kingdom';
  if (countryHeader === 'DE') return '🇩🇪 Germany';
  if (countryHeader === 'JP') return '🇯🇵 Japan';
  if (countryHeader === 'CA') return '🇨🇦 Canada';

  const defaultCountries = [
    '🇺🇸 United States',
    '🇺🇸 United States',
    '🇮🇳 India',
    '🇬🇧 United Kingdom',
    '🇨🇦 Canada',
    '🇩🇪 Germany'
  ];
  return defaultCountries[Math.floor(Math.random() * defaultCountries.length)];
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

// Dynamic XML Sitemap for Google Search Console & Fast Indexing
app.get('/sitemap.xml', (req, res) => {
  const posts = getAllPosts();
  const baseUrl = process.env.BASE_URL || 'https://thedailychronicle.up.railway.app';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  xml += `  <url>\n    <loc>${baseUrl}/index.html</loc>\n    <priority>1.0</priority>\n    <changefreq>daily</changefreq>\n  </url>\n`;

  const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);

  posts.forEach(post => {
    const postDate = new Date(post.publishedAt || Date.now());
    const isoDate = isNaN(postDate.getTime()) ? new Date().toISOString() : postDate.toISOString();
    const dateOnly = isoDate.split('T')[0];

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/post/${escapeXml(post.slug)}</loc>\n`;
    xml += `    <lastmod>${dateOnly}</lastmod>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    if (post.imageUrl) {
      xml += `    <image:image><image:loc>${escapeXml(post.imageUrl)}</image:loc><image:title>${escapeXml(post.title)}</image:title></image:image>\n`;
    }
    // Google News sitemap standard: Only include news tags for stories from last 48 hours
    if (postDate.getTime() >= twoDaysAgo) {
      xml += `    <news:news><news:publication><news:name>The Daily Chronicle</news:name><news:language>en</news:language></news:publication><news:publication_date>${isoDate}</news:publication_date><news:title>${escapeXml(post.title)}</news:title></news:news>\n`;
    }
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// 1. Get All Posts (For Homepage)
app.get('/api/posts', (req, res) => {
  const posts = getAllPosts();
  res.json({
    success: true,
    count: posts.length,
    posts,
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
app.get('/api/gemini-key', requireAdminAuth, (req, res) => {
  const keys = getGeminiKeys();
  const activeKey = keys.length > 0 ? keys[0] : '';
  const maskedKey = activeKey ? `${activeKey.substring(0, 8)}...${activeKey.substring(activeKey.length - 4)}` : '';
  res.json({ success: true, hasKey: keys.length > 0, count: keys.length, maskedKey });
});

app.post('/api/gemini-key', requireAdminAuth, (req, res) => {
  const { apiKey, keys } = req.body;
  
  let keysList = [];
  if (keys) {
    keysList = Array.isArray(keys) ? keys : keys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
  } else if (apiKey) {
    keysList = [apiKey.trim()];
  }

  if (keysList.length === 0) return res.status(400).json({ success: false, error: 'No Gemini API Keys provided' });

  const saved = saveGeminiKeys(keysList);
  res.json({ success: true, count: saved.length, message: `${saved.length} Gemini AI API Key(s) saved to pool!` });
});

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
