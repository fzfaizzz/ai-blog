import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbGetAllPosts, dbGetPostBySlug, dbSavePost, dbDeletePost, dbTogglePostVisibility, dbIncrementViews } from './db.js';
import { submitUrlToIndexNow } from './indexNowManager.js';
import { submitToGoogleIndexing } from './googleIndexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cachedPosts = [];

function loadLocalPosts() {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, 'utf8');
      const posts = JSON.parse(data);
      if (Array.isArray(posts)) {
        cachedPosts = posts;
      }
    }
  } catch (e) {}
}
loadLocalPosts();

export async function syncPostsFromDB() {
  try {
    await connectDB();
    const dbPosts = await dbGetAllPosts();
    if (Array.isArray(dbPosts)) {
      cachedPosts = dbPosts;
      try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2));
      } catch (e) {}
      console.log(`📦 [MongoDB] Synchronized ${cachedPosts.length} persistent articles from database.`);
    }
  } catch (e) {
    console.error('Error syncing posts from DB:', e);
  }
}

// Background sync on startup
syncPostsFromDB();

const INITIAL_ANALYTICS = {
  countryViews: {}
};

if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(INITIAL_ANALYTICS, null, 2));
}

/**
 * Gets all published blog posts (instant 0ms response from synchronized cache).
 * @param {boolean} [includeHidden=false] - Set true for Admin Panel to see hidden posts
 */
export function getAllPosts(includeHidden = false) {
  if (includeHidden) return cachedPosts;
  return cachedPosts.filter(p => !p.hidden);
}

/**
 * Gets a single post by slug.
 */
export function getPostBySlug(slug) {
  const posts = getAllPosts(true);
  return posts.find(p => p.slug === slug) || null;
}

/**
 * Gets a single post by slug asynchronously with MongoDB cloud fallback.
 */
export async function getPostBySlugAsync(slug) {
  let post = getPostBySlug(slug);
  if (post) return post;
  try {
    const dbPost = await dbGetPostBySlug(slug);
    if (dbPost) {
      cachedPosts.unshift(dbPost);
      return dbPost;
    }
  } catch (e) {}
  return null;
}


/**
 * Toggles a post's hidden state (Hide / Show)
 */
export function togglePostVisibility(identifier) {
  const posts = getAllPosts(true);
  const post = posts.find(p => p.id == identifier || p.slug === identifier);
  if (post) {
    post.hidden = !post.hidden;
    try { fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2)); } catch (e) {}
    dbTogglePostVisibility(identifier, post.hidden).catch(() => {});
    console.log(`👁️ Post "${post.title}" visibility toggled: hidden = ${post.hidden}`);
    return post;
  }
  return null;
}

/**
 * Deletes a post permanently from database
 */
export function deletePost(identifier) {
  let posts = getAllPosts(true);
  const initialLength = posts.length;
  cachedPosts = posts.filter(p => p.id != identifier && p.slug !== identifier);
  
  if (cachedPosts.length < initialLength) {
    try { fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2)); } catch (e) {}
    dbDeletePost(identifier).catch(() => {});
    console.log(`🗑️ Post deleted: ${identifier}`);
    return true;
  }
  return false;
}

/**
 * Increments real view count for an article and country.
 */
export function recordRealView(slug, countryName = '🇺🇸 United States') {
  try {
    const post = cachedPosts.find(p => p.slug === slug);
    if (post) {
      post.views = (post.views || 0) + 1;
      try { fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2)); } catch (e) {}
      dbIncrementViews(slug).catch(() => {});
    }

    let analytics = INITIAL_ANALYTICS;
    if (fs.existsSync(ANALYTICS_FILE)) {
      analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    }

    if (!analytics.countryViews) analytics.countryViews = {};
    analytics.countryViews[countryName] = (analytics.countryViews[countryName] || 0) + 1;

    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
  } catch (e) {
    console.error('Error recording real view:', e);
  }
}

/**
 * Gets real live analytics for Admin Control Panel.
 */
export function getRealAnalyticsData() {
  const posts = getAllPosts();
  
  // Calculate total real combined views from database
  const totalPostViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  // Sort posts by actual real views
  const sortedPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
  const topTopics = sortedPosts.filter(p => (p.views || 0) > 0).slice(0, 5).map(p => ({
    title: p.title,
    category: p.category || 'World News',
    views: p.views || 0
  }));

  let analytics = { countryViews: {} };
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    }
  } catch (e) {}

  const cMap = analytics.countryViews || {};
  let totalCountryViews = Object.values(cMap).reduce((a, b) => a + b, 0);

  const realTotal = Math.max(totalPostViews, totalCountryViews);

  const countryTraffic = Object.entries(cMap)
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({
      country,
      pageViews: count.toLocaleString(),
      percent: `${realTotal > 0 ? Math.round((count / realTotal) * 100) : 0}%`
    }));

  return {
    totalMonthlyViews: realTotal.toLocaleString(),
    topTopics,
    countryTraffic
  };
}

import { sendPostToTelegram } from './telegramManager.js';
import { sendPostViaUserbot } from './userbotManager.js';
import { sendPostToTwitter } from './twitterManager.js';
import { sendTweetViaCookieSession } from './customTwitterBot.js';
import { sendPostToReddit } from './redditManager.js';

/**
 * Publishes a new article to the blog.
 */
export async function publishPost(postData) {
  const slug = postData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  // 🔗 Smart Internal Link Injection (Guards against AdSense "Low-Value Content" flags)
  let finalHtml = postData.contentHtml || '';
  if (!finalHtml.includes('/post/') && cachedPosts.length > 0) {
    const candidatePosts = cachedPosts.filter(p => p.slug && p.slug !== slug);
    if (candidatePosts.length > 0) {
      const related = candidatePosts[Math.floor(Math.random() * Math.min(candidatePosts.length, 6))];
      const linkBox = `
        <div class="article-internal-link-box" style="margin: 2.2rem 0; padding: 1.25rem; background: #F8FAFC; border-left: 4px solid #2563EB; border-radius: 8px;">
          <div style="font-size: 0.75rem; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem;">Related Newsroom Intelligence &amp; Analysis</div>
          <a href="/post/${related.slug}" style="font-size: 1.05rem; font-weight: 700; color: #0F172A; text-decoration: none; display: block; line-height: 1.45;">${related.title} &rarr;</a>
        </div>
      `;
      const lastH2 = finalHtml.lastIndexOf('<h2');
      if (lastH2 > 200) {
        finalHtml = finalHtml.substring(0, lastH2) + linkBox + finalHtml.substring(lastH2);
      } else {
        finalHtml += linkBox;
      }
    }
  }

  const newPost = {
    id: Date.now(),
    slug,
    title: postData.title,
    metaDescription: postData.metaDescription || '',
    contentHtml: finalHtml,
    imageUrl: postData.imageUrl,
    imageCredit: postData.imageCredit || 'Unsplash / Media Provider',
    category: postData.category || 'Trending',
    readTimeMinutes: postData.readTimeMinutes || 4,
    views: 0,
    publishedAt: new Date().toISOString()
  };

  cachedPosts.unshift(newPost);
  try { fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2)); } catch (e) {}
  await dbSavePost(newPost);

  console.log(`✅ Auto-Published Post to MongoDB & Cache: "${newPost.title}" [Slug: ${newPost.slug}]`);

  // Asynchronously broadcast to Telegram & Twitter (Reddit permanently removed per policy)
  sendPostToTelegram(newPost).catch(e => console.error('Telegram broadcast background error:', e));
  sendPostViaUserbot(newPost).catch(e => console.error('Telegram Userbot background error:', e));
  sendPostToTwitter(newPost).catch(e => console.error('Twitter API broadcast background error:', e));
  sendTweetViaCookieSession(newPost).catch(e => console.error('Custom Twitter Cookie Bot error:', e));
  // Reddit auto-poster permanently disabled per policy

  // Asynchronously submit to IndexNow (Bing, DuckDuckGo, Yandex) & Ping Search Engines
  const domain = (process.env.BASE_URL || 'https://primemedia.site').replace(/\/+$/, '');
  const postUrl = `${domain}/post/${newPost.slug}`;
  pingSearchEngines(postUrl);

  return newPost;
}

async function pingSearchEngines(postUrl) {
  const domain = (process.env.BASE_URL || 'https://primemedia.site').replace(/\/+$/, '');
  const feedUrl = `${domain}/feed.xml`;
  const rssUrl = `${domain}/rss.xml`;

  // 1. Official Instant IndexNow Protocol (Bing, DuckDuckGo, Yahoo, Yandex, Seznam, Naver) & Google Indexing API
  if (postUrl) {
    submitUrlToIndexNow(postUrl).catch(e => console.error('IndexNow post error:', e));
    submitToGoogleIndexing(postUrl, 'URL_UPDATED').catch(e => console.error('Google Indexing API error:', e));
  }

  // 2. Official Google WebSub / PubSubHubbub Real-Time Push (Instant Google News & Discover Feed Ingestion)
  try {
    const body = `hub.mode=publish&hub.url=${encodeURIComponent(feedUrl)}&hub.url=${encodeURIComponent(rssUrl)}`;
    fetch('https://pubsubhubbub.appspot.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    }).catch(() => {});
  } catch (e) {}
}
