import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbGetAllPosts, dbSavePost, dbDeletePost, dbTogglePostVisibility, dbIncrementViews } from './db.js';

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

// Initial default seed posts if database is empty
const INITIAL_POSTS = [
  {
    id: 1,
    slug: 'ultimate-guide-to-ai-tools-2026',
    title: 'The Ultimate Guide to AI Tools in 2026: Boost Your Daily Productivity',
    metaDescription: 'Discover the top AI tools that are changing how we work, write, and create in 2026.',
    contentHtml: `
      <div class="human-article">
        <p class="lead-para">AI tools are evolving faster than ever. If you're looking to streamline your workflow and save hours of manual work every week, you're in the right place.</p>
        <h2>1. Why Smart AI Tools Matter Today</h2>
        <p>Instead of doing repetitive tasks manually, modern AI utilities help you automate writing, research, coding, and design in seconds.</p>
        <h2>2. Key Benefits</h2>
        <ul>
          <li>Faster Execution Speed</li>
          <li>Lower Operating Costs</li>
          <li>Higher Quality Outputs</li>
        </ul>
      </div>
    `,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'Unsplash / Tech Visuals',
    category: 'Technology',
    readTimeMinutes: 4,
    views: 0,
    publishedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

function loadLocalPosts() {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, 'utf8');
      const posts = JSON.parse(data);
      if (Array.isArray(posts) && posts.length > 0) {
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
    if (Array.isArray(dbPosts) && dbPosts.length > 0) {
      cachedPosts = dbPosts;
      try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2));
      } catch (e) {}
      console.log(`📦 [MongoDB] Loaded and synchronized ${cachedPosts.length} persistent articles.`);
    } else if (cachedPosts.length > 0) {
      // Seed DB with local cache
      for (const p of cachedPosts) {
        await dbSavePost(p);
      }
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
  if (cachedPosts.length === 0) {
    loadLocalPosts();
  }
  if (cachedPosts.length === 0) {
    return INITIAL_POSTS;
  }
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
export function publishPost(postData) {
  getAllPosts(); // Ensure cache is ready
  const slug = postData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const newPost = {
    id: Date.now(),
    slug,
    title: postData.title,
    metaDescription: postData.metaDescription || '',
    contentHtml: postData.contentHtml,
    imageUrl: postData.imageUrl,
    imageCredit: postData.imageCredit || 'Unsplash / Media Provider',
    category: postData.category || 'Trending',
    readTimeMinutes: postData.readTimeMinutes || 4,
    views: 0,
    publishedAt: new Date().toISOString()
  };

  cachedPosts.unshift(newPost);
  try { fs.writeFileSync(POSTS_FILE, JSON.stringify(cachedPosts, null, 2)); } catch (e) {}
  dbSavePost(newPost).catch(e => console.error('Error saving post to MongoDB:', e));

  console.log(`✅ Auto-Published Post: "${newPost.title}" [Slug: ${newPost.slug}]`);

  // Asynchronously broadcast to Telegram Bot, Telegram Userbot, Twitter API, Custom Twitter & Reddit
  sendPostToTelegram(newPost).catch(e => console.error('Telegram broadcast background error:', e));
  sendPostViaUserbot(newPost).catch(e => console.error('Telegram Userbot background error:', e));
  sendPostToTwitter(newPost).catch(e => console.error('Twitter API broadcast background error:', e));
  sendTweetViaCookieSession(newPost).catch(e => console.error('Custom Twitter Cookie Bot error:', e));
  sendPostToReddit(newPost).catch(e => console.error('Reddit Auto-Poster error:', e));

  // Asynchronously ping Google Search & Bing IndexNow for instant indexing
  pingSearchEngines();

  return newPost;
}

async function pingSearchEngines() {
  const domain = process.env.BASE_URL || 'https://primemedia.site';
  const sitemapUrl = encodeURIComponent(`${domain}/news-sitemap.xml`);
  const fullSitemapUrl = encodeURIComponent(`${domain}/sitemap.xml`);
  try {
    fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`).catch(() => {});
    fetch(`https://www.google.com/ping?sitemap=${fullSitemapUrl}`).catch(() => {});
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`).catch(() => {});
    console.log(`⚡ Successfully Pinged Google Search & Bing Search with updated Sitemaps (${domain})!`);
  } catch (e) {}
}
