import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

const SEED_FILE = path.join(__dirname, 'seed_posts.json');

function initializePostsFile() {
  try {
    if (!fs.existsSync(POSTS_FILE)) {
      if (fs.existsSync(SEED_FILE)) {
        fs.copyFileSync(SEED_FILE, POSTS_FILE);
      } else {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_POSTS, null, 2));
      }
    } else {
      const current = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
      if (!Array.isArray(current) || current.length <= 1) {
        if (fs.existsSync(SEED_FILE)) {
          fs.copyFileSync(SEED_FILE, POSTS_FILE);
        }
      }
    }
  } catch (e) {
    console.error('Error initializing posts file:', e);
  }
}

initializePostsFile();

const INITIAL_ANALYTICS = {
  countryViews: {}
};

if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(INITIAL_ANALYTICS, null, 2));
}

/**
 * Gets all published blog posts.
 * @param {boolean} [includeHidden=false] - Set true for Admin Panel to see hidden posts
 */
export function getAllPosts(includeHidden = false) {
  try {
    const data = fs.readFileSync(POSTS_FILE, 'utf8');
    const posts = JSON.parse(data);
    if (includeHidden) return posts;
    return posts.filter(p => !p.hidden);
  } catch (e) {
    return INITIAL_POSTS;
  }
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
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
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
  posts = posts.filter(p => p.id != identifier && p.slug !== identifier);
  
  if (posts.length < initialLength) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
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
    const posts = getAllPosts();
    const post = posts.find(p => p.slug === slug);
    if (post) {
      post.views = (post.views || 0) + 1;
      fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
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
import { sendPostToTwitter } from './twitterManager.js';
import { sendTweetViaCookieSession } from './customTwitterBot.js';

/**
 * Publishes a new article to the blog.
 */
export function publishPost(postData) {
  const posts = getAllPosts();
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

  posts.unshift(newPost);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));

  console.log(`✅ Auto-Published Post: "${newPost.title}" [Slug: ${newPost.slug}]`);

  // Asynchronously broadcast to Telegram, Twitter API & Custom Cookie Twitter Bot if enabled
  sendPostToTelegram(newPost).catch(e => console.error('Telegram broadcast background error:', e));
  sendPostToTwitter(newPost).catch(e => console.error('Twitter API broadcast background error:', e));
  sendTweetViaCookieSession(newPost).catch(e => console.error('Custom Twitter Cookie Bot error:', e));

  // Asynchronously ping Google Search & Bing IndexNow for instant indexing
  pingSearchEngines();

  return newPost;
}

async function pingSearchEngines() {
  const sitemapUrl = encodeURIComponent('https://www.nextgentimes.jo3.org/news-sitemap.xml');
  try {
    fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`).catch(() => {});
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`).catch(() => {});
    console.log('⚡ Successfully Pinged Google Search & Bing Search with updated Sitemap!');
  } catch (e) {}
}
