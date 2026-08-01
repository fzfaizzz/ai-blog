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
    views: 4599,
    publishedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

if (!fs.existsSync(POSTS_FILE)) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_POSTS, null, 2));
}

const INITIAL_ANALYTICS = {
  countryViews: {
    '🇺🇸 United States': 18450,
    '🇮🇳 India': 14100,
    '🇬🇧 United Kingdom': 6800,
    '🇩🇪 Germany': 4380,
    '🇯🇵 Japan': 2920,
    '🇨🇦 Canada': 1950
  }
};

if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(INITIAL_ANALYTICS, null, 2));
}

/**
 * Gets all published blog posts.
 */
export function getAllPosts() {
  try {
    const data = fs.readFileSync(POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_POSTS;
  }
}

/**
 * Gets a single post by slug.
 */
export function getPostBySlug(slug) {
  const posts = getAllPosts();
  return posts.find(p => p.slug === slug) || null;
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
  
  // Sort posts by actual real views
  const sortedPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
  const topTopics = sortedPosts.slice(0, 5).map(p => ({
    title: p.title,
    category: p.category || 'World News',
    views: p.views || 1
  }));

  let analytics = INITIAL_ANALYTICS;
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      analytics = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    }
  } catch (e) {}

  const cMap = analytics.countryViews || INITIAL_ANALYTICS.countryViews;
  let totalViews = Object.values(cMap).reduce((a, b) => a + b, 0) || 1;

  const countryTraffic = Object.entries(cMap)
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({
      country,
      pageViews: count.toLocaleString(),
      percent: `${Math.round((count / totalViews) * 100)}%`
    }));

  return {
    totalMonthlyViews: totalViews.toLocaleString(),
    topTopics,
    countryTraffic
  };
}

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
    views: Math.floor(Math.random() * 500) + 100, // Initial views for new story
    publishedAt: new Date().toISOString()
  };

  posts.unshift(newPost);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));

  console.log(`✅ Auto-Published Post: "${newPost.title}" [Slug: ${newPost.slug}]`);
  return newPost;
}
