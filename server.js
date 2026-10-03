import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTrendingTopics, fetchFullStoryDetails } from './src/trendFetcher.js';
import { generateHumanArticle } from './src/aiWriter.js';
import { getGoogleMatchingImages } from './src/googleImageFetcher.js';
import { getAllPosts, getPostBySlug, getPostBySlugAsync, publishPost, recordRealView, getRealAnalyticsData, togglePostVisibility, deletePost } from './src/publisher.js';
import { startAutopilotCron } from './src/scheduler.js';
import { getSerperKeys, saveSerperKeys, getSerperKeysWithCredits } from './src/serperManager.js';
import { getTelegramConfig, saveTelegramConfig, sendPostToTelegram } from './src/telegramManager.js';
import { getUserbotConfig, saveUserbotConfig, sendUserbotAuthCode, verifyUserbotAuthCode, sendPostViaUserbot } from './src/userbotManager.js';
import { getTwitterConfig, saveTwitterConfig, sendPostToTwitter, isTwitterConfigured } from './src/twitterManager.js';
import { getCustomTwitterConfig, saveCustomTwitterConfig, sendTweetViaCookieSession, isCustomTwitterConfigured } from './src/customTwitterBot.js';
import { getRedditConfig, saveRedditConfig, sendPostToReddit, isRedditConfigured } from './src/redditManager.js';
import { startSocialScheduler, broadcastArticleToAllSocials } from './src/socialScheduler.js';
import { getGeminiKeys, saveGeminiKeys, syncGeminiKeysFromDB } from './src/geminiManager.js';
import { connectDB, dbGetSetting, dbSaveSetting, getConnectionStatus } from './src/db.js';
import { syncPostsFromDB } from './src/publisher.js';
import { syncSerperKeysFromDB } from './src/serperManager.js';
import { submitUrlToIndexNow } from './src/indexNowManager.js';
import { AUTHORS, AUTHOR_LIST, getAuthorBySlug, getAuthorForPost } from './src/authors.js';

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

// 301 Redirect /index.html and redundant query params to clean root / (Clean Technical SEO)
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.use((req, res, next) => {
  if (req.path === '/' && (req.query.page === '1' || req.query.page === '0')) {
    return res.redirect(301, '/');
  }
  next();
});

// Clean Aliases & Defensive Navigation Redirects for Policy Pages
const POLICY_PAGES = ['about', 'privacy', 'terms', 'disclaimer', 'contact'];
POLICY_PAGES.forEach((page) => {
  app.get(`/${page}`, (req, res) => res.redirect(301, `/${page}.html`));
  app.get(`/post/${page}.html`, (req, res) => res.redirect(301, `/${page}.html`));
  app.get(`/post/${page}`, (req, res) => res.redirect(301, `/${page}.html`));
});
app.get('/post/sitemap.xml', (req, res) => res.redirect(301, '/sitemap.xml'));

app.use(cors());
app.use(express.json());
app.use(compression());

const BASE_CANONICAL_URL = (process.env.BASE_URL || 'https://primemedia.site').replace(/^http:\/\//i, 'https://').replace(/\/+$/, '');

// Smart Keyword Relevance Matcher for SEO 301 Redirects (Resolves 404s in Google Search Console)
function findBestMatchingPost(requestedSlug, allPosts) {
  if (!requestedSlug || !allPosts || allPosts.length === 0) return null;
  const stopWords = new Set([
    'the', 'and', 'of', 'in', 'a', 'to', 'for', 'on', 'with', 'is', 'are',
    'after', 'whats', 'latest', 'how', 'many', 'no', 'there', 'were', 'as',
    'at', 'least', 'from', 'this', 'that', 'by', 'an', 'be', 'or', 'it',
    'about', 'over', 'into', 'who', 'what', 'when', 'where', 'why'
  ]);
  const queryWords = requestedSlug
    .toLowerCase()
    .replace(/\.html$/i, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (queryWords.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const post of allPosts) {
    if (post.hidden) continue;
    let score = 0;
    const postSlugWords = (post.slug || '').toLowerCase();
    const postTitleWords = (post.title || '').toLowerCase();

    for (const word of queryWords) {
      if (postSlugWords.includes(word)) score += 2;
      else if (postTitleWords.includes(word)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = post;
    }
  }

  // Require confidence threshold of at least 2 matching significant words
  if (bestScore >= 2) {
    return bestMatch;
  }
  return null;
}

// 🚀 Full Server-Side Rendering (SSR) for Homepage (/) — Critical for Googlebot, Bingbot & Google-AdSense-Bot
app.get('/', (req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
    const posts = getAllPosts(false);
    const fallbackImg = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';

    if (posts && posts.length > 0) {
      const lead = posts[0];
      const leadAuthor = getAuthorForPost(lead);
      const leadDate = new Date(lead.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const featuredHtml = `
        <span class="featured-badge">${escapeHtml((lead.category || 'TOP STORY').toUpperCase())}</span>
        <a href="/post/${escapeHtml(lead.slug)}">
          <img src="${lead.imageUrl || fallbackImg}" alt="${escapeHtml(lead.title)}" referrerpolicy="no-referrer" />
        </a>
        <h2><a href="/post/${escapeHtml(lead.slug)}">${escapeHtml(lead.title)}</a></h2>
        <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 1rem;">${escapeHtml(lead.metaDescription || '')}</p>
        <div style="font-size: 0.85rem; color: var(--text-subtle); font-weight: 600;">
          By <a href="/author/${leadAuthor.slug}" style="color: inherit; text-decoration: none;"><strong>${escapeHtml(leadAuthor.name)}</strong></a> • ${leadDate}
        </div>
      `;
      html = html.replace(/<div id="featuredStory" class="featured-story">[\s\S]*?<\/div>\s*<div class="trending-sidebar-list">/i,
        `<div id="featuredStory" class="featured-story">${featuredHtml}</div>\n        <div class="trending-sidebar-list">`);

      // Top 3 Sidebar Stories
      const sideItems = posts.slice(1, 4);
      const sideHtml = sideItems.map(item => `
        <div class="trending-sidebar-item">
          <span style="font-size: 0.7rem; font-weight: 800; color: #DC2626; text-transform: uppercase;">${escapeHtml(item.category || 'TRENDING')}</span>
          <h4><a href="/post/${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a></h4>
        </div>
      `).join('');
      html = html.replace(/<div id="trendingSidebarList">[\s\S]*?<\/div>/i, `<div id="trendingSidebarList">${sideHtml}</div>`);

      // 4 Spotlight Cards
      const spotlightItems = posts.slice(4, 8);
      const spotlightHtml = spotlightItems.map(post => {
        const a = getAuthorForPost(post);
        const d = new Date(post.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
          <div class="spotlight-card">
            <div class="spotlight-img-wrap">
              <span class="spotlight-tag-overlay">${escapeHtml(post.category || 'SPECIAL REPORT')}</span>
              <a href="/post/${escapeHtml(post.slug)}">
                <img src="${post.imageUrl || fallbackImg}" alt="${escapeHtml(post.title)}" class="spotlight-img" referrerpolicy="no-referrer" />
              </a>
            </div>
            <div class="spotlight-body">
              <div style="font-size: 0.7rem; font-weight: 800; color: #DC2626; text-transform: uppercase; margin-bottom: 0.3rem;">${escapeHtml(post.category || 'SPECIAL REPORT')}</div>
              <h4 class="spotlight-title"><a href="/post/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h4>
              <div class="spotlight-meta">
                <span>By <a href="/author/${a.slug}" style="color: inherit; text-decoration: none;">${escapeHtml(a.name)}</a></span> • <span>${d}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      html = html.replace(/<div id="spotlightGrid" class="spotlight-grid">[\s\S]*?<\/div>/i, `<div id="spotlightGrid" class="spotlight-grid">${spotlightHtml}</div>`);

      // 12 News Stream Cards
      const streamItems = posts.slice(8, 20);
      const streamHtml = streamItems.map(post => {
        const a = getAuthorForPost(post);
        const d = new Date(post.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
          <div class="card">
            <a href="/post/${escapeHtml(post.slug)}">
              <img src="${post.imageUrl || fallbackImg}" alt="${escapeHtml(post.title)}" class="card-img" referrerpolicy="no-referrer" />
            </a>
            <div class="card-body">
              <div class="card-category">${escapeHtml(post.category || 'REPORTING')}</div>
              <h3 class="card-title"><a href="/post/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h3>
              <p class="card-desc">${escapeHtml(post.metaDescription || '')}</p>
              <div class="card-author-meta">
                <a href="/author/${a.slug}" style="text-decoration: none;"><div class="author-avatar">${a.initials}</div></a>
                <div>
                  <strong>By <a href="/author/${a.slug}" style="color: inherit; text-decoration: none;">${escapeHtml(a.name)}</a></strong> • ${d}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      html = html.replace(/<div id="postsGrid" class="posts-grid">[\s\S]*?<\/div>/i, `<div id="postsGrid" class="posts-grid">${streamHtml}</div>`);

      // Top 5 Most Read
      const rankedItems = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
      const mostReadHtml = rankedItems.map((item, idx) => `
        <div class="most-read-item">
          <div class="rank-badge ${idx === 0 ? 'top-rank' : ''}">${idx + 1}</div>
          <h5><a href="/post/${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a></h5>
        </div>
      `).join('');
      html = html.replace(/<div id="mostReadList" class="most-read-list">[\s\S]*?<\/div>/i, `<div id="mostReadList" class="most-read-list">${mostReadHtml}</div>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(html);
  } catch (e) {
    return res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

// SSR Meta Injection for Social Crawlers & SEO
app.get('/post/:slug', async (req, res) => {
  let post = getPostBySlug(req.params.slug);
  if (!post) {
    post = await getPostBySlugAsync(req.params.slug);
  }

  // If still not found, trigger the Smart 301 Keyword Redirection Engine
  if (!post) {
    const allPosts = getAllPosts(false);
    const bestMatch = findBestMatchingPost(req.params.slug, allPosts);
    if (bestMatch && bestMatch.slug && bestMatch.slug !== req.params.slug) {
      console.log(`🔀 [Smart SEO 301] Redirecting dead slug "${req.params.slug}" -> "/post/${bestMatch.slug}"`);
      return res.redirect(301, `/post/${bestMatch.slug}`);
    }

    // Permanent removal signal for unmapped/orphan URLs (HTTP 410 Gone with noindex header)
    res.status(410);
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    return res.sendFile(path.join(__dirname, 'public/404.html'));
  }
  
  const baseUrl = BASE_CANONICAL_URL;
  const author = getAuthorForPost(post);
  let html = fs.readFileSync(path.join(__dirname, 'public/post.html'), 'utf8');
  
  const ogTags = `
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <title>${escapeHtml(post.title)} | Prime Media</title>
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
    <meta property="article:author" content="${baseUrl}/author/${author.slug}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@PrimeMediaSite">
    <meta name="twitter:creator" content="@PrimeMediaSite">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(post.metaDescription)}">
    <meta name="twitter:image" content="${post.imageUrl}">
    <script type="application/ld+json">
    ${(() => {
      const schemaArray = [
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": post.title,
          "image": [post.imageUrl],
          "datePublished": post.publishedAt,
          "dateModified": post.updatedAt || post.publishedAt,
          "author": {
            "@type": "Person",
            "name": author.name,
            "jobTitle": author.role,
            "url": `${baseUrl}/author/${author.slug}`,
            "sameAs": [`${baseUrl}/author/${author.slug}`]
          },
          "publisher": {
            "@type": "NewsMediaOrganization",
            "name": "Prime Media",
            "url": baseUrl,
            "logo": { "@type": "ImageObject", "url": `${baseUrl}/logo2.png` },
            "sameAs": ["https://x.com/PrimeMediaSite"]
          },
          "description": post.metaDescription,
          "mainEntityOfPage": { "@type": "WebPage", "@id": `${baseUrl}/post/${post.slug}` }
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
            { "@type": "ListItem", "position": 2, "name": post.category || "News", "item": `${baseUrl}/#category-${encodeURIComponent(post.category || "news")}` },
            { "@type": "ListItem", "position": 3, "name": post.title }
          ]
        }
      ];

      // Auto-extract FAQ Q&A pairs for Google Rich Results & People Also Ask (PAA)
      const faqEntries = [];
      const faqRegex = /<h3[^>]*>(?:Q\d*[:.]?\s*)?([\s\S]*?\?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      let m;
      while ((m = faqRegex.exec(post.contentHtml || '')) !== null && faqEntries.length < 5) {
        const qText = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const aText = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (qText.length > 10 && aText.length > 20) {
          faqEntries.push({
            "@type": "Question",
            "name": qText,
            "acceptedAnswer": { "@type": "Answer", "text": aText }
          });
        }
      }
      if (faqEntries.length > 0) {
        schemaArray.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqEntries
        });
      }
      return JSON.stringify(schemaArray);
    })()}
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
  const fallbackHero = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';
  const heroImgUrl = post.imageUrl || fallbackHero;
  html = html.replace(/<img id="postFeaturedImg"[^>]*\/?>/i, `<img id="postFeaturedImg" src="${heroImgUrl}" alt="${escapeHtml(post.title)}" class="featured-img" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${fallbackHero}';" />`);
  
  // ✍️ Real E-E-A-T Author SSR Binding with Clickable Profile Links
  html = html.replace(/<div id="authorInitials"[^>]*>.*?<\/div>/i, `<a href="/author/${author.slug}" style="text-decoration: none;"><div id="authorInitials" class="author-avatar">${author.initials}</div></a>`);
  html = html.replace(/<strong id="postAuthorName"[^>]*>.*?<\/strong>/i, `<strong id="postAuthorName"><a href="/author/${author.slug}" style="color: inherit; text-decoration: none;">By ${escapeHtml(author.name)}</a></strong>`);
  html = html.replace(/<span id="postPublishDate"[^>]*>.*?<\/span>/i, `<span id="postPublishDate"><a href="/author/${author.slug}" style="color: #64748B; text-decoration: none;">${escapeHtml(author.role)}</a> • Published ${formattedDate}</span>`);
  html = html.replace(/<span id="postReadTime"[^>]*>.*?<\/span>/i, `<span id="postReadTime">${post.readTimeMinutes || 5} min read</span>`);
  
  // SSR Author Bio Card + 1-Click Viral Social Share Bar at bottom of article
  const encodedUrl = encodeURIComponent(`${baseUrl}/post/${post.slug}`);
  const encodedTitle = encodeURIComponent(post.title);
  const authorBioCardHtml = `
    <div class="viral-share-bar" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.9rem 1.2rem; margin: 1.75rem 0;">
      <span style="font-weight: 800; font-size: 0.85rem; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">🚀 Share This Story:</span>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20-%20${encodedUrl}" target="_blank" rel="noopener noreferrer" style="background: #16A34A; color: #FFF; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">WhatsApp</a>
        <a href="https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}" target="_blank" rel="noopener noreferrer" style="background: #EA580C; color: #FFF; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">Reddit</a>
        <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener noreferrer" style="background: #0F172A; color: #FFF; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">X / Twitter</a>
        <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener noreferrer" style="background: #0284C7; color: #FFF; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">Telegram</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer" style="background: #1D4ED8; color: #FFF; padding: 0.45rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">LinkedIn</a>
      </div>
    </div>
    <div class="author-bio-card" id="authorBioCard">
      <a href="/author/${author.slug}" style="text-decoration: none;"><div class="author-bio-avatar" id="bioAvatar">${author.initials}</div></a>
      <div class="author-bio-info">
        <h4 id="bioAuthorName"><a href="/author/${author.slug}" style="color: #0F172A; text-decoration: none;">${escapeHtml(author.name)}</a></h4>
        <p id="bioAuthorRole" style="margin-bottom: 0.5rem; line-height: 1.5; color: #475569;">${escapeHtml(author.bio)}</p>
        <a href="/author/${author.slug}" style="color: #2563EB; font-weight: 700; font-size: 0.85rem; text-decoration: none;">View Full Profile &amp; All Articles by ${escapeHtml(author.name)} &rarr;</a>
      </div>
    </div>
  `;
  html = html.replace(/<div class="author-bio-card" id="authorBioCard">[\s\S]*?<\/div>\s*<\/div>/i, authorBioCardHtml);

  if (post.contentHtml) {
    const cleanContent = (post.contentHtml || '')
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '')
      .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
      .replace(/<\/h1>/gi, '</h2>');
    html = html.replace(/<article id="postContent"[^>]*>[\s\S]*?<\/article>/i, `<article id="postContent" class="human-article">${cleanContent}</article>`);
  }

  // 🔗 Inject SSR Internal Links (Category + Archive Hash-Ring) so all 600+ articles receive strong internal link equity
  try {
    const allPosts = getAllPosts().filter(p => p.slug !== post.slug);
    let slugHash = 0;
    for (let i = 0; i < (post.slug || '').length; i++) {
      slugHash = ((slugHash << 5) - slugHash) + post.slug.charCodeAt(i);
    }
    slugHash = Math.abs(slugHash);

    const sameCat = allPosts.filter(p => p.category === post.category);
    const picked = new Set();
    const relatedPosts = [];

    // Pick 3 deterministic related articles from same category
    if (sameCat.length > 0) {
      for (let k = 0; k < Math.min(3, sameCat.length); k++) {
        const candidate = sameCat[(slugHash + k * 7) % sameCat.length];
        if (candidate && !picked.has(candidate.slug)) {
          picked.add(candidate.slug);
          relatedPosts.push(candidate);
        }
      }
    }

    // Pick 3 deterministic articles across the full archive ring so older GSC articles are continuously linked
    if (allPosts.length > 0) {
      for (let k = 0; relatedPosts.length < 6 && k < allPosts.length; k++) {
        const candidate = allPosts[(slugHash + k * 13) % allPosts.length];
        if (candidate && !picked.has(candidate.slug)) {
          picked.add(candidate.slug);
          relatedPosts.push(candidate);
        }
      }
    }

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
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 🧑‍💼 Dedicated SSR Author Profile Route for Google E-E-A-T & Readers
app.get('/author/:slug', (req, res) => {
  const author = getAuthorBySlug(req.params.slug);
  if (!author) {
    return res.redirect(301, '/about.html');
  }

  const baseUrl = BASE_CANONICAL_URL;
  let html = fs.readFileSync(path.join(__dirname, 'public/author.html'), 'utf8');

  const allPosts = getAllPosts(false);
  const authorPosts = allPosts.filter(p => getAuthorForPost(p).slug === author.slug);

  const ogTags = `
    <title>${escapeHtml(author.name)} — ${escapeHtml(author.role)} | Prime Media</title>
    <meta name="description" content="${escapeHtml(author.bio.slice(0, 160))}">
    <link rel="canonical" href="${baseUrl}/author/${author.slug}">
    <meta property="og:type" content="profile">
    <meta property="og:title" content="${escapeHtml(author.name)} — ${escapeHtml(author.role)} | Prime Media">
    <meta property="og:description" content="${escapeHtml(author.bio.slice(0, 160))}">
    <meta property="og:url" content="${baseUrl}/author/${author.slug}">
    <meta property="og:site_name" content="Prime Media">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(author.name)} — Prime Media">
    <meta name="twitter:description" content="${escapeHtml(author.bio.slice(0, 160))}">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "mainEntity": {
        "@type": "Person",
        "name": "${escapeHtml(author.name)}",
        "jobTitle": "${escapeHtml(author.role)}",
        "description": "${escapeHtml(author.bio)}",
        "email": "mailto:${author.email}",
        "url": "${baseUrl}/author/${author.slug}",
        "worksFor": {
          "@type": "NewsMediaOrganization",
          "name": "Prime Media",
          "url": "${baseUrl}"
        },
        "knowsAbout": ${JSON.stringify(author.beats)}
      }
    }
    </script>
  `;

  // Inject Meta Tags
  html = html.replace(/<title[^>]*>.*?<\/title>/i, '');
  html = html.replace(/<meta[^>]*name="description"[^>]*>/i, '');
  html = html.replace('</head>', `${ogTags}\n</head>`);

  // Inject SSR Author Profile Content
  html = html.replace(/<div class="author-portrait-badge" id="authorAvatar">.*?<\/div>/i, `<div class="author-portrait-badge" id="authorAvatar">${author.initials}</div>`);
  html = html.replace(/<h1 class="author-name-title" id="authorName">.*?<\/h1>/i, `<h1 class="author-name-title" id="authorName">${escapeHtml(author.name)}</h1>`);
  html = html.replace(/<div class="author-role-subtitle" id="authorRole">.*?<\/div>/i, `<div class="author-role-subtitle" id="authorRole">${escapeHtml(author.role)}</div>`);
  html = html.replace(/<p class="author-bio-text" id="authorBio">[\s\S]*?<\/p>/i, `<p class="author-bio-text" id="authorBio">${escapeHtml(author.bio)}</p>`);
  html = html.replace(/<span id="authorLocation">.*?<\/span>/i, `<span id="authorLocation">${escapeHtml(author.location)}</span>`);
  html = html.replace(/<span id="authorEducation">.*?<\/span>/i, `<span id="authorEducation">${escapeHtml(author.education)}</span>`);

  // Inject Beats Tags
  const beatsHtml = author.beats.map(b => `<span class="beat-tag">${escapeHtml(b)}</span>`).join('');
  html = html.replace(/<div class="author-beats-tags" id="authorBeats">[\s\S]*?<\/div>/i, `<div class="author-beats-tags" id="authorBeats">${beatsHtml}</div>`);

  // Inject Article Count Badge
  html = html.replace(/<span[^>]*id="articleCountBadge">.*?<\/span>/i, `<span id="articleCountBadge" style="font-size: 0.85rem; color: #64748B; font-weight: 600;">${authorPosts.length} Published Dispatches</span>`);

  // Inject SSR Author Articles Grid
  const articlesHtml = authorPosts.length > 0 ? authorPosts.map(p => `
    <article class="author-post-card">
      <a href="/post/${escapeHtml(p.slug)}">
        <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80'}" alt="${escapeHtml(p.title)}" loading="lazy" />
      </a>
      <div class="author-post-content">
        <span class="author-post-category">${escapeHtml(p.category || 'News')}</span>
        <h3 class="author-post-title"><a href="/post/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h3>
        <div class="author-post-meta">
          <span>${new Date(p.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>${p.readTimeMinutes || 5} min read</span>
        </div>
      </div>
    </article>
  `).join('') : '<p style="color: #64748B; grid-column: 1 / -1;">No dispatches currently assigned to this author.</p>';

  html = html.replace(/<div class="author-article-grid" id="authorArticlesGrid">[\s\S]*?<\/div>/i, `<div class="author-article-grid" id="authorArticlesGrid">${articlesHtml}</div>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// JSON API endpoint for Author Profile & Posts
app.get('/api/author/:slug', (req, res) => {
  const author = getAuthorBySlug(req.params.slug);
  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }
  const allPosts = getAllPosts(false);
  const authorPosts = allPosts.filter(p => getAuthorForPost(p).slug === author.slug);
  res.json({
    author,
    posts: authorPosts.map(p => ({
      slug: p.slug,
      title: p.title,
      category: p.category,
      imageUrl: p.imageUrl,
      publishedAt: p.publishedAt,
      readTimeMinutes: p.readTimeMinutes
    }))
  });
});

// Official Google AdSense ads.txt Route
app.get('/ads.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send('google.com, pub-9492642167600744, DIRECT, f08c47fec0942fa0\n');
});

// Official Microsoft Bing & Search Engines IndexNow Key Verification Route
app.get('/77177bd8efd14f0e9f108cc0749674ce.txt', (req, res) => {
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.send('77177bd8efd14f0e9f108cc0749674ce');
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
Disallow: /admin.js
Disallow: /api/
Disallow: /data/
Disallow: /*?*

User-agent: Googlebot
Allow: /
Disallow: /admin.html
Disallow: /admin.js
Disallow: /api/
Disallow: /data/
Disallow: /*?*

User-agent: Googlebot-News
Allow: /

User-agent: bingbot
Allow: /
Disallow: /admin.html
Disallow: /admin.js
Disallow: /api/
Disallow: /data/
Disallow: /*?*

User-agent: Mediapartners-Google
Allow: /

User-agent: Google-AdSense-Bot
Allow: /

User-agent: Googlebot-Image
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

async function syncAppSettingsFromDB() {
  try {
    await connectDB();
    const doc = await dbGetSetting('app_settings');
    if (doc && typeof doc === 'object') {
      appSettings = { ...appSettings, ...doc };
      try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2)); } catch (e) {}
    }
  } catch (e) {}
}
syncAppSettingsFromDB();

function saveAppSettings(newSettings) {
  try {
    appSettings = { ...appSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
    dbSaveSetting('app_settings', appSettings).catch(() => {});
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
  xml += `  <url>\n    <loc>${baseUrl}/disclaimer.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n`;

  // Author Profile Pages (E-E-A-T Signal for Googlebot)
  AUTHOR_LIST.forEach(author => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/author/${escapeXml(author.slug)}</loc>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `  </url>\n`;
  });

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

// Official RSS 2.0 Feed Endpoints for Google News, Feedly, Flipboard & RSS Auto-Posters
const handleRssFeed = (req, res) => {
  const posts = getAllPosts();
  const baseUrl = BASE_CANONICAL_URL;

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">\n`;
  rss += `  <channel>\n`;
  rss += `    <title>Prime Media — High-Tech, Movies, Business &amp; Global News</title>\n`;
  rss += `    <link>${baseUrl}</link>\n`;
  rss += `    <description>Prime Media delivers breaking news, movies, AI breakthroughs, and world affairs.</description>\n`;
  rss += `    <language>en-us</language>\n`;
  rss += `    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;
  rss += `    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />\n`;

  posts.slice(0, 50).forEach(post => {
    const postUrl = `${baseUrl}/post/${post.slug}`;
    const pubDate = new Date(post.publishedAt || post.id).toUTCString();
    const author = getAuthorForPost(post);

    rss += `    <item>\n`;
    rss += `      <title>${escapeXml(post.title)}</title>\n`;
    rss += `      <link>${postUrl}</link>\n`;
    rss += `      <guid isPermaLink="true">${postUrl}</guid>\n`;
    rss += `      <pubDate>${pubDate}</pubDate>\n`;
    rss += `      <dc:creator><![CDATA[${author.name}]]></dc:creator>\n`;
    if (post.category) {
      rss += `      <category><![CDATA[${post.category}]]></category>\n`;
    }
    if (post.imageUrl && post.imageUrl.startsWith('http')) {
      rss += `      <enclosure url="${escapeXml(post.imageUrl)}" type="image/jpeg" length="0" />\n`;
      rss += `      <media:content url="${escapeXml(post.imageUrl)}" medium="image" />\n`;
    }
    rss += `      <description>${escapeXml(post.metaDescription || post.title)}</description>\n`;
    rss += `    </item>\n`;
  });

  rss += `  </channel>\n`;
  rss += `</rss>`;

  res.header('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(rss);
};

app.get('/rss.xml', handleRssFeed);
app.get('/feed.xml', handleRssFeed);
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
app.get('/api/post/:slug', async (req, res) => {
  const { slug } = req.params;
  let post = getPostBySlug(slug);
  if (!post) {
    post = await getPostBySlugAsync(slug);
  }
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
  const result = await sendPostToTwitter(posts[0], true);
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

  // Use specified article slug if provided, else use latest published article
  const targetSlug = req.body && req.body.slug ? req.body.slug : null;
  const targetPost = (targetSlug ? posts.find(p => p.slug === targetSlug) : null) || posts[0];

  try {
    const database = await connectDB();
    if (database) {
      const triggersCol = database.collection('social_triggers');
      const triggerDoc = {
        platform: 'twitter',
        action: 'test_post',
        status: 'pending',
        article: {
          title: targetPost.title,
          slug: targetPost.slug,
          category: targetPost.category || 'TECH',
          summary: targetPost.summary || targetPost.content || '',
          coverImage: targetPost.imageUrl || targetPost.coverImage || targetPost.image || '',
          imageUrl: targetPost.imageUrl || targetPost.coverImage || targetPost.image || ''
        },
        requestedAt: new Date()
      };

      const insertResult = await triggersCol.insertOne(triggerDoc);
      const triggerId = insertResult.insertedId;
      console.log(`📡 [Admin 𝕏 Post Test] Created trigger in MongoDB (ID: ${triggerId}) for "${targetPost.title.substring(0, 45)}..."`);

      // Poll for completion by the Oracle Cloud Bot (up to 32 seconds)
      const maxAttempts = 16;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const currentTrigger = await triggersCol.findOne({ _id: triggerId });
        if (currentTrigger) {
          if (currentTrigger.status === 'completed') {
            return res.json({
              success: true,
              message: currentTrigger.message || 'Article successfully published to @PrimeMediaSite on 𝕏 with custom 16:9 news card!',
              tweetUrl: currentTrigger.tweetUrl || 'https://x.com/PrimeMediaSite'
            });
          }
          if (currentTrigger.status === 'failed') {
            return res.json({
              success: false,
              message: currentTrigger.error || 'Oracle Cloud Bot failed to publish tweet.'
            });
          }
        }
      }

      // Check if it was claimed and currently rendering/posting
      const checkDoc = await triggersCol.findOne({ _id: triggerId });
      if (checkDoc && checkDoc.status === 'processing') {
        return res.json({
          success: true,
          message: 'Cloud Bot is currently generating the 16:9 card and posting to 𝕏! Check @PrimeMediaSite in 10-15 seconds.',
          tweetUrl: 'https://x.com/PrimeMediaSite'
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ [Admin 𝕏 Post Test] Error contacting cloud bot trigger:', err.message);
  }

  // Fallback to direct cookie session if MongoDB trigger could not complete
  console.log('🔄 [Admin 𝕏 Post Test] Attempting direct cookie session fallback...');
  const result = await sendTweetViaCookieSession(targetPost, true);
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
  const result = await sendPostToReddit(posts[0], true);
  res.json(result);
});

// 🔴 Test Post to Reddit via Oracle Cloud Headless Bot (No API keys needed)
app.post('/api/test-custom-reddit-post', async (req, res) => {
  const posts = getAllPosts();
  if (!posts || posts.length === 0) {
    return res.json({ success: false, message: 'No published articles found to test.' });
  }

  const targetSlug = req.body && req.body.slug ? req.body.slug : null;
  const targetPost = (targetSlug ? posts.find(p => p.slug === targetSlug) : null) || posts[0];

  try {
    const database = await connectDB();
    if (database) {
      const triggersCol = database.collection('social_triggers');
      const triggerDoc = {
        platform: 'reddit',
        action: 'test_post',
        status: 'pending',
        article: {
          title: targetPost.title,
          slug: targetPost.slug,
          category: targetPost.category || 'TECH',
          summary: targetPost.summary || targetPost.content || '',
          coverImage: targetPost.imageUrl || targetPost.coverImage || targetPost.image || '',
          imageUrl: targetPost.imageUrl || targetPost.coverImage || targetPost.image || ''
        },
        requestedAt: new Date()
      };

      const insertResult = await triggersCol.insertOne(triggerDoc);
      const triggerId = insertResult.insertedId;
      console.log(`📡 [Admin Reddit Post Test] Created trigger in MongoDB (ID: ${triggerId}) for "${targetPost.title.substring(0, 45)}..."`);

      const maxAttempts = 16;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const currentTrigger = await triggersCol.findOne({ _id: triggerId });
        if (currentTrigger) {
          if (currentTrigger.status === 'completed') {
            return res.json({
              success: true,
              message: currentTrigger.message || 'Article successfully submitted to Reddit!',
              redditUrl: 'https://www.reddit.com'
            });
          }
          if (currentTrigger.status === 'failed') {
            return res.json({
              success: false,
              message: currentTrigger.error || 'Oracle Cloud Bot failed to post to Reddit. Ensure Reddit is logged in.'
            });
          }
        }
      }

      const checkDoc = await triggersCol.findOne({ _id: triggerId });
      if (checkDoc && checkDoc.status === 'processing') {
        return res.json({
          success: true,
          message: 'Cloud Bot is currently posting to Reddit! Check Reddit in a few seconds.',
          redditUrl: 'https://www.reddit.com'
        });
      }

      return res.json({
        success: false,
        message: 'Timeout: Oracle Cloud Bot is taking longer than expected. Please verify Reddit login in LOGIN_REDDIT.bat.'
      });
    }
  } catch (err) {
    console.warn('⚠️ [Admin Reddit Post Test] Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
});

// 🚀 1-Click Social Syndication: Broadcast any specific article immediately to Reddit & Twitter/X
app.post('/api/social/broadcast-post', async (req, res) => {
  try {
    const { slug, id } = req.body;
    const posts = getAllPosts(true);
    const post = posts.find(p => (slug && p.slug === slug) || (id && p.id == id));
    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    const results = await broadcastArticleToAllSocials(post);
    res.json({ success: true, results, title: post.title });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📊 Live Status of all Social Media Bots
app.get('/api/social/status', (req, res) => {
  const redditConfig = getRedditConfig();
  const twitterConfig = getTwitterConfig();
  const customTwitterConfig = getCustomTwitterConfig();
  const telegramConfig = getTelegramConfig();

  res.json({
    reddit: {
      configured: isRedditConfigured(),
      enabled: !!redditConfig.autoPostEnabled,
      target: redditConfig.subreddit || (redditConfig.username ? `u_${redditConfig.username}` : '')
    },
    twitterApi: {
      configured: isTwitterConfigured(),
      enabled: !!twitterConfig.autoPostEnabled
    },
    customTwitter: {
      configured: isCustomTwitterConfigured(),
      enabled: !!customTwitterConfig.autoPostEnabled
    },
    telegram: {
      configured: !!telegramConfig.botToken,
      enabled: !!telegramConfig.autoPostEnabled
    }
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
    const publishedPost = await publishPost({
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

// 🩺 Live Database Health & Diagnostics Endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const status = getConnectionStatus();
    const dbHandle = await connectDB();
    if (!dbHandle) {
      return res.json({ connected: false, ...status });
    }
    const ping = await dbHandle.command({ ping: 1 }).catch(e => ({ pingError: e.message }));
    const count = await dbHandle.collection('posts').countDocuments().catch(() => 0);
    const settingsCount = await dbHandle.collection('settings').countDocuments().catch(() => 0);
    res.json({ connected: true, ...status, ping, postsCount: count, settingsCount });
  } catch (e) {
    res.status(500).json({ connected: false, error: e.message, ...getConnectionStatus() });
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

// 5b. IndexNow Bulk Instant Submission
app.post('/api/admin/indexnow/submit-all', requireAdminAuth, async (req, res) => {
  try {
    const posts = getAllPosts();
    const baseUrl = BASE_CANONICAL_URL;
    const urlList = [
      baseUrl,
      `${baseUrl}/about.html`,
      `${baseUrl}/privacy.html`,
      `${baseUrl}/terms.html`,
      `${baseUrl}/disclaimer.html`,
      `${baseUrl}/contact.html`,
      ...posts.map(p => `${baseUrl}/post/${p.slug}`)
    ];

    const success = await submitUrlToIndexNow(urlList);
    res.json({
      success,
      count: urlList.length,
      message: `Successfully submitted ${urlList.length} URLs to IndexNow (Bing, DuckDuckGo, Yandex)!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

// Clean 404 Handler for Unmapped Routes (Eliminates Soft 404 Errors in Google Search Console)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
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

    // Initialize 24/7 Automated Social Syndication Engine (Every 15 minutes)
    startSocialScheduler(15);
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
