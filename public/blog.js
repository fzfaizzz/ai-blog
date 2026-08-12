// Client JavaScript for The Daily Chronicle

const HUMAN_AUTHORS = [
  { name: 'Sarah Jenkins', role: 'Senior Tech Correspondent', initials: 'SJ' },
  { name: 'David Chen', role: 'Global Markets Analyst', initials: 'DC' },
  { name: 'Elena Rostova', role: 'Innovation & Science Editor', initials: 'ER' },
  { name: 'Marcus Vance', role: 'Executive Editor', initials: 'MV' }
];

let currentCategory = 'ALL';
let currentSearchQuery = '';
let currentPage = 1;
const POSTS_PER_PAGE = 12;
let cachedPosts = [];

// Load Homepage Grid Posts & Featured Hero with Live Search & Pagination
async function loadHomepagePosts(category = null, page = null) {
  const postsGrid = document.getElementById('postsGrid');
  const featuredStory = document.getElementById('featuredStory');
  const trendingSidebarList = document.getElementById('trendingSidebarList');
  const headerTitle = document.getElementById('reportingHeaderTitle');
  const paginationContainer = document.getElementById('paginationContainer');

  if (!postsGrid) return;

  if (category !== null) {
    currentCategory = category;
    currentPage = 1; // Reset to Page 1 on category change
    sessionStorage.setItem('homepage_page', 1);
  }

  // Restore page number from URL or Session Storage when returning via Browser Back button
  if (page !== null) {
    currentPage = page;
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    const savedPage = parseInt(urlParams.get('page')) || parseInt(sessionStorage.getItem('homepage_page')) || 1;
    currentPage = savedPage;
  }

  // Persist current page in Session Storage & URL query string
  sessionStorage.setItem('homepage_page', currentPage);
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('page', currentPage);
    window.history.replaceState(null, '', newUrl.toString());
  } catch (e) {}

  // Update Header Title
  if (headerTitle) {
    if (currentSearchQuery) {
      headerTitle.innerText = `SEARCH RESULTS FOR "${currentSearchQuery.toUpperCase()}"`;
    } else {
      headerTitle.innerText = currentCategory === 'ALL' 
        ? 'LATEST REPORTING — ALL HEADLINES' 
        : `LATEST REPORTING — ${currentCategory.toUpperCase()}`;
    }
  }

  try {
    if (cachedPosts.length === 0) {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success && data.posts) {
        cachedPosts = data.posts;
      }
    }

    if (cachedPosts.length > 0) {
      // 1. Filter by Category
      let filtered = currentCategory === 'ALL'
        ? cachedPosts
        : cachedPosts.filter(p => (p.category || '').toLowerCase().includes(currentCategory.toLowerCase()) || (p.title || '').toLowerCase().includes(currentCategory.toLowerCase()));

      // 2. Filter by Search Query
      if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.trim().toLowerCase();
        filtered = filtered.filter(p => 
          (p.title || '').toLowerCase().includes(q) || 
          (p.metaDescription || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      }

      if (filtered.length === 0) {
        postsGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-secondary); border-radius: 8px;">
          🔍 No articles found matching "<strong>${escapeHtml(currentSearchQuery || currentCategory)}</strong>".
        </div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      // 3. Dynamic Featured Hero & Trending Sidebar (Updates dynamically on Search & Category Filters)
      const heroSection = document.querySelector('.hero-layout');
      if (heroSection) heroSection.style.display = 'grid'; // Ensure hero section is visible

      if (featuredStory && filtered.length > 0) {
        const lead = filtered[0];
        const author = HUMAN_AUTHORS[0];
        const categoryTag = (currentCategory !== 'ALL') ? currentCategory : (lead.category || 'TOP STORY');
        
        featuredStory.innerHTML = `
          <span class="featured-badge">${escapeHtml(categoryTag.toUpperCase())}</span>
          <a href="/post/${lead.slug}">
            <img src="${lead.imageUrl}" alt="${escapeHtml(lead.title)}" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80'" />
          </a>
          <h2><a href="/post/${lead.slug}">${escapeHtml(lead.title)}</a></h2>
          <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 1rem;">${escapeHtml(lead.metaDescription)}</p>
          <div style="font-size: 0.85rem; color: var(--text-subtle); font-weight: 600;">
            By <strong>${author.name}</strong> • ${new Date(lead.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        `;
      }

      if (trendingSidebarList) {
        trendingSidebarList.innerHTML = '';
        const sideItems = filtered.length > 1 ? filtered.slice(1, 4) : filtered.slice(0, 3);
        sideItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'trending-sidebar-item';
          div.innerHTML = `
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-blue); text-transform: uppercase;">${escapeHtml(item.category || 'TRENDING')}</span>
            <h4><a href="/post/${item.slug}">${escapeHtml(item.title)}</a></h4>
          `;
          trendingSidebarList.appendChild(div);
        });
      }

function getPostsPerPage() {
  const width = window.innerWidth;
  if (width < 768) {
    return 6;  // Phone: 6 articles (1 col x 6 rows)
  } else if (width <= 1024) {
    return 9;  // Tablet: 9 articles (2 col x 4.5 rows)
  } else {
    return 12; // PC / Laptop: 12 articles (3 col x 4 rows)
  }
}

      // 4. Calculate Dynamic Device-Based Pagination Slices
      const postsPerPage = getPostsPerPage();
      const totalPages = Math.ceil(filtered.length / postsPerPage) || 1;
      if (currentPage > totalPages) currentPage = totalPages;

      const startIndex = (currentPage - 1) * postsPerPage;
      const paginatedPosts = filtered.slice(startIndex, startIndex + postsPerPage);

      // 5. Render Main Grid
      postsGrid.innerHTML = '';
      paginatedPosts.forEach((post, index) => {
        const author = HUMAN_AUTHORS[(index + startIndex) % HUMAN_AUTHORS.length];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <a href="/post/${post.slug}">
            <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="card-img" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80'" />
          </a>
          <div class="card-body">
            <div class="card-category">${escapeHtml(post.category || 'REPORTING')}</div>
            <h3 class="card-title">
              <a href="/post/${post.slug}">${escapeHtml(post.title)}</a>
            </h3>
            <p class="card-desc">${escapeHtml(post.metaDescription)}</p>
            <div class="card-author-meta">
              <div class="author-avatar">${author.initials}</div>
              <div>
                <strong>By ${author.name}</strong> • ${new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        `;
        postsGrid.appendChild(card);
      });

      // 6. Render Pagination Controls
      renderPagination(totalPages);
    } else {
      postsGrid.innerHTML = '<div style="color: var(--text-subtle);">No published articles found.</div>';
    }
  } catch (e) {
    postsGrid.innerHTML = `<div style="color: var(--text-subtle);">Error loading articles: ${e.message}</div>`;
  }
}

// Render Pagination Buttons
function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''} style="padding: 0.5rem 1rem; background: ${currentPage === 1 ? 'var(--bg-secondary)' : '#2563EB'}; color: ${currentPage === 1 ? 'var(--text-muted)' : '#FFF'}; border: 1px solid var(--border-light); border-radius: 6px; font-weight: 700; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};">
      ⬅️ Previous
    </button>
    <span style="font-weight: 700; color: var(--text-main); font-size: 0.9rem; padding: 0 0.5rem;">
      Page ${currentPage} of ${totalPages}
    </span>
    <button id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 0.5rem 1rem; background: ${currentPage === totalPages ? 'var(--bg-secondary)' : '#2563EB'}; color: ${currentPage === totalPages ? 'var(--text-muted)' : '#FFF'}; border: 1px solid var(--border-light); border-radius: 6px; font-weight: 700; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};">
      Next ➡️
    </button>
  `;

  container.innerHTML = html;

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  if (prevBtn && currentPage > 1) {
    prevBtn.addEventListener('click', () => {
      loadHomepagePosts(null, currentPage - 1);
      scrollToGridTop();
    });
  }

  if (nextBtn && currentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      loadHomepagePosts(null, currentPage + 1);
      scrollToGridTop();
    });
  }
}

function scrollToGridTop() {
  const target = document.getElementById('reportingHeaderTitle');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

// Bind Category Navigation & Search Input Listeners
function initCategoryFilter() {
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetCat = btn.getAttribute('data-category');

      // Update Active UI State
      categoryBtns.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-muted)';
      });
      btn.classList.add('active');
      btn.style.color = '#2563EB';

      // Reset Search & Load Category
      currentSearchQuery = '';
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';

      loadHomepagePosts(targetCat, 1);
    });
  });

  // Bind Search Input Handler
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      currentPage = 1;
      loadHomepagePosts(null, 1);
    });
  }
}

function setMetaTag(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('article:')) {
      el.setAttribute('property', property);
    } else {
      el.setAttribute('name', property);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalTag(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

// Load Single Article Page
let isArticleLoading = false;
async function loadSingleArticle() {
  if (isArticleLoading) return;
  isArticleLoading = true;

  const params = new URLSearchParams(window.location.search);
  // Support both /post/slug and post.html?slug=slug
  let slug = params.get('slug');
  if (!slug) {
    const pathMatch = window.location.pathname.match(/\/post\/(.+)/);
    if (pathMatch) slug = pathMatch[1];
  }
  if (!slug) return;

  try {
    const res = await fetch(`/api/post/${slug}`);
    const data = await res.json();

    if (data.success && data.post) {
      const p = data.post;
      const author = HUMAN_AUTHORS[Math.abs(hashString(p.slug)) % HUMAN_AUTHORS.length];

      if (document.getElementById('pageTitle')) document.getElementById('pageTitle').innerText = `${p.title} — NEXGEN TIMES`;
      if (document.getElementById('metaDesc')) document.getElementById('metaDesc').content = p.metaDescription;

      // Dynamic SEO Meta Tags for Social Sharing
      const postUrl = `${window.location.origin}/post/${p.slug}`;
      setMetaTag('og:type', 'article');
      setMetaTag('og:title', p.title + ' — NEXGEN TIMES');
      setMetaTag('og:description', p.metaDescription);
      setMetaTag('og:url', postUrl);
      setMetaTag('og:image', p.imageUrl);
      setMetaTag('og:site_name', 'NEXGEN TIMES');
      setMetaTag('article:published_time', p.publishedAt);
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', p.title + ' — NEXGEN TIMES');
      setMetaTag('twitter:description', p.metaDescription);
      setMetaTag('twitter:image', p.imageUrl);
      setCanonicalTag(postUrl);
      if (document.getElementById('postTitle')) document.getElementById('postTitle').innerText = p.title;
      if (document.getElementById('postLeadDesc')) document.getElementById('postLeadDesc').innerText = p.metaDescription;
      if (document.getElementById('postFeaturedImg')) document.getElementById('postFeaturedImg').src = p.imageUrl;
      if (document.getElementById('postCategoryPill')) document.getElementById('postCategoryPill').innerText = (p.category || 'TECHNOLOGY').toUpperCase();

      if (document.getElementById('authorInitials')) document.getElementById('authorInitials').innerText = author.initials;
      if (document.getElementById('authorSignoffInitials')) document.getElementById('authorSignoffInitials').innerText = author.initials;
      if (document.getElementById('postAuthorName')) document.getElementById('postAuthorName').innerText = `By ${author.name}`;
      if (document.getElementById('signoffAuthorTitle')) document.getElementById('signoffAuthorTitle').innerText = `Written by ${author.name}`;
      if (document.getElementById('postPublishDate')) document.getElementById('postPublishDate').innerText = `${author.role} • Published ${new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      if (document.getElementById('postReadTime')) document.getElementById('postReadTime').innerText = `${p.readTimeMinutes || 5} min read`;

      let html = p.contentHtml;

      // Clean up any old Photo Credit text
      html = html.replace(/<div[^>]*>Photo Credit:.*?<\/div>/gi, '');

      // In-Article Native Ad Unit Template
      const inArticleAdHtml = `
        <div class="adsense-container" style="margin: 2.25rem 0;">
          <div class="ad-label">SPONSORED ARTICLE AD</div>
          <ins class="adsbygoogle"
               style="display:block; text-align:center;"
               data-ad-layout="in-article"
               data-ad-format="fluid"
               data-ad-client="ca-pub-9492642167600744"
               data-ad-slot="4359866610"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        </div>
      `;

      // Inject In-Article Native Ad after 1st H2 and In-Article Recommended Widget after 2nd H2
      let h2Count = 0;
      html = html.replace(/<h2>/g, (match) => {
        h2Count++;
        if (h2Count === 2) {
          return `<div id="inArticleRecommendedPlaceholder"></div><h2>`;
        }
        if (h2Count === 4) {
          return `${inArticleAdHtml}<h2>`;
        }
        return match;
      });

      if (document.getElementById('postContent')) document.getElementById('postContent').innerHTML = html;

      // Load Recommended & Suggested Stories (Both Mid-Article & Bottom Grid)
      loadRecommendedArticles(p.slug, p.category);
    }
  } catch (e) {
    console.error('Error loading article:', e);
  }
}

// Render Recommended Post Cards (Mid-Article Widget + Bottom Section)
async function loadRecommendedArticles(currentSlug, category) {
  const bottomGrid = document.getElementById('recommendedGrid');
  const midPlaceholder = document.getElementById('inArticleRecommendedPlaceholder');

  try {
    const res = await fetch('/api/posts');
    const data = await res.json();

    if (data.success && Array.isArray(data.posts)) {
      // Exclude current active article
      const otherPosts = data.posts.filter(p => p.slug !== currentSlug);
      if (otherPosts.length === 0) return;

      // 1. Render Mid-Article Recommended Section (Clean Native Article Grid)
      if (midPlaceholder) {
        const midPosts = otherPosts.slice(0, 2);
        midPlaceholder.innerHTML = `
          <div class="in-article-recommended" style="margin: 2.5rem 0; padding: 1.5rem 0; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
            <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0 0 1.25rem 0; text-transform: uppercase; letter-spacing: 0.04em;">
              Related Stories
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem;">
              ${midPosts.map(p => `
                <div class="article-card" style="display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;">
                  <a href="/post/${p.slug}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
                    <div style="width: 100%; height: 140px; overflow: hidden; background: #0F172A; position: relative;">
                      <img src="${p.imageUrl}" alt="${escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80'" />
                    </div>
                    <div style="padding: 0.9rem; display: flex; flex-direction: column; flex-grow: 1;">
                      <span style="font-size: 0.675rem; font-weight: 800; color: #2563EB; text-transform: uppercase; margin-bottom: 0.35rem;">${escapeHtml(p.category || 'NEWS')}</span>
                      <h5 style="font-family: var(--font-heading); font-size: 0.925rem; font-weight: 700; line-height: 1.35; color: #0F172A; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${escapeHtml(p.title)}
                      </h5>
                    </div>
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // 2. Render Bottom Grid (3 Posts)
      if (bottomGrid) {
        const bottomPosts = otherPosts.sort(() => 0.5 - Math.random()).slice(0, 3);
        bottomGrid.innerHTML = bottomPosts.map(p => `
          <article class="article-card" style="display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;">
            <a href="/post/${p.slug}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
              <div style="width: 100%; height: 160px; overflow: hidden; background: #000; position: relative;">
                <img src="${p.imageUrl}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: contain; background: #0F172A;" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80'" />
              </div>
              <div style="padding: 1.15rem; display: flex; flex-direction: column; flex-grow: 1;">
                <div style="font-size: 0.725rem; font-weight: 800; color: #2563EB; letter-spacing: 0.05em; margin-bottom: 0.4rem; text-transform: uppercase;">
                  ${p.category || 'WORLD NEWS'}
                </div>
                <h4 style="font-family: var(--font-heading); font-size: 1.05rem; line-height: 1.35; color: var(--text-main); margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${p.title}
                </h4>
                <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                  <span>⏱️ ${p.readTimeMinutes || 5} min read</span>
                  <span style="color: #2563EB; font-weight: 700;">Read ➔</span>
                </div>
              </div>
            </a>
          </article>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Error loading recommended articles:', e);
  }
}

// Admin Control Panel Handlers
let isAdminPanelInitialized = false;
function initAdminPanel() {
  if (isAdminPanelInitialized) return;
  isAdminPanelInitialized = true;

  const loginModal = document.getElementById('adminLoginModal');
  const loginForm = document.getElementById('adminLoginForm');
  const passwordInput = document.getElementById('adminPasswordInput');
  const loginError = document.getElementById('adminLoginError');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  const changePassForm = document.getElementById('changePasswordForm');
  const currentPassInput = document.getElementById('currentPassInput');
  const newPassInput = document.getElementById('newPassInput');
  const changePassStatus = document.getElementById('changePassStatus');

  const triggerBtn = document.getElementById('triggerAutoBlogBtn');
  const triggerStatus = document.getElementById('triggerStatus');
  const topicInput = document.getElementById('customTopicInput');
  const logsPre = document.getElementById('adminLogs');

  const keysContainer = document.getElementById('serperKeysContainer');
  const addKeyBtn = document.getElementById('addKeyBtn');
  const saveSerperKeysBtn = document.getElementById('saveSerperKeysBtn');
  const serperKeysStatus = document.getElementById('serperKeysStatus');

  const topTopicsList = document.getElementById('topTopicsList');
  const countryTrafficList = document.getElementById('countryTrafficList');

  // Check Admin Authentication Token
  function checkAdminAuth() {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
      if (loginModal) loginModal.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      loadAdminDashboardData();
    } else {
      if (loginModal) loginModal.style.display = 'flex';
    }
  }

  // Password Eye Toggle Show/Hide Handler
  document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.innerText = isPass ? '🙈' : '👁️';
      }
    });
  });

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value.trim() : '';
      if (!password) return;

      if (loginError) loginError.style.display = 'none';

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.success && data.token) {
          sessionStorage.setItem('adminToken', data.token);
          if (passwordInput) passwordInput.value = '';
          checkAdminAuth();
        } else {
          if (loginError) {
            loginError.innerText = data.error || 'Incorrect password!';
            loginError.style.display = 'block';
          }
        }
      } catch (err) {
        if (loginError) {
          loginError.innerText = 'Server connection error!';
          loginError.style.display = 'block';
        }
      }
    });
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('adminToken');
      checkAdminAuth();
    });
  }

  // Change Admin Password Handler
  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = currentPassInput ? currentPassInput.value.trim() : '';
      const newPassword = newPassInput ? newPassInput.value.trim() : '';
      const targetPass = newPassword || currentPassword;

      if (!targetPass || targetPass.length < 4) {
        if (changePassStatus) {
          changePassStatus.style.color = '#DC2626';
          changePassStatus.innerText = '❌ Password must be at least 4 characters!';
        }
        return;
      }

      if (changePassStatus) changePassStatus.innerText = '⌛ Updating password...';

      try {
        const res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword: targetPass })
        });
        const data = await res.json();

        if (data.success) {
          if (changePassStatus) {
            changePassStatus.style.color = '#059669';
            changePassStatus.innerText = `✅ Password updated & saved to: "${data.newPassword}"`;
          }
          if (currentPassInput) currentPassInput.value = '';
          if (newPassInput) newPassInput.value = '';
        } else {
          if (changePassStatus) {
            changePassStatus.style.color = '#DC2626';
            changePassStatus.innerText = `❌ ${data.error || 'Failed to update password'}`;
          }
        }
      } catch (err) {
        if (changePassStatus) {
          changePassStatus.style.color = '#DC2626';
          changePassStatus.innerText = '❌ Connection error!';
        }
      }
    });
  }

  function loadAdminDashboardData() {
    loadGeminiKeyStatus();
    loadSerperKeysAndCredits();
    loadAnalytics();
    loadAdminArticlesList();
  }

  // Auto-refresh analytics and articles every 15 seconds while Admin is active
  setInterval(() => {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel && adminPanel.style.display !== 'none') {
      loadAnalytics();
      loadAdminArticlesList();
    }
  }, 15000);

  // Admin Articles Manager State & Functions
  let adminAllPosts = [];
  let adminSearchQuery = '';
  let adminPerPage = 10;

  async function loadAdminArticlesList() {
    const container = document.getElementById('adminArticlesList');
    const badge = document.getElementById('adminArticlesCountBadge');
    if (!container) return;

    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch('/api/admin/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        adminAllPosts = data.posts;
        if (badge) badge.innerText = `${adminAllPosts.length} Total Articles`;
        renderAdminArticlesList();
      }
    } catch (e) {
      if (container) container.innerHTML = `<div style="padding: 1rem; color: #DC2626;">Error loading articles list</div>`;
    }
  }

  function renderAdminArticlesList() {
    const container = document.getElementById('adminArticlesList');
    if (!container) return;

    // Filter by Search Query
    let filtered = adminAllPosts;
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => 
        (p.title || '').toLowerCase().includes(q) || 
        (p.category || '').toLowerCase().includes(q) ||
        (p.slug || '').toLowerCase().includes(q)
      );
    }

    // Slice by Show Per Page Dropdown
    let displayPosts = filtered;
    if (adminPerPage !== 'all') {
      const count = parseInt(adminPerPage) || 10;
      displayPosts = filtered.slice(0, count);
    }

    if (displayPosts.length === 0) {
      container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No articles found matching search criteria.</div>`;
      return;
    }

    container.innerHTML = displayPosts.map(p => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-bottom: 1px solid #F1F5F9; flex-wrap: wrap; gap: 0.75rem; background: ${p.hidden ? '#FFFBEB' : '#FFFFFF'};">
        <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 260px;">
          <img src="${p.imageUrl}" alt="${p.title}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #0F172A;" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=300&q=80'" />
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: #0F172A; line-height: 1.3;">
              <a href="/post/${p.slug}" target="_blank" style="color: inherit; text-decoration: none;">${escapeHtml(p.title)}</a>
            </div>
            <div style="font-size: 0.75rem; color: #64748B; margin-top: 0.2rem;">
              📁 <strong>${p.category || 'News'}</strong> • 👁️ ${p.views || 0} views • 🗓️ ${new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <!-- Status Badge -->
          <span style="font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 12px; background: ${p.hidden ? '#FEF3C7' : '#DCFCE7'}; color: ${p.hidden ? '#D97706' : '#15803D'};">
            ${p.hidden ? '🙈 HIDDEN' : '🟢 PUBLIC'}
          </span>

          <!-- Hide/Unhide Button -->
          <button class="admin-toggle-btn" data-id="${p.id}" style="padding: 0.4rem 0.75rem; font-size: 0.775rem; font-weight: 700; background: ${p.hidden ? '#059669' : '#D97706'}; color: #FFF; border: none; border-radius: 4px; cursor: pointer;">
            ${p.hidden ? '👁️ Unhide' : '🙈 Hide'}
          </button>

          <!-- Delete Button -->
          <button class="admin-delete-btn" data-id="${p.id}" data-title="${escapeHtml(p.title)}" style="padding: 0.4rem 0.75rem; font-size: 0.775rem; font-weight: 700; background: #DC2626; color: #FFF; border: none; border-radius: 4px; cursor: pointer;">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    // Bind Action Button Handlers
    container.querySelectorAll('.admin-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        try {
          const token = sessionStorage.getItem('adminToken') || '';
          const res = await fetch('/api/admin/post/toggle-visibility', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
          });
          const data = await res.json();
          if (data.success) {
            cachedPosts = []; // Clear homepage cache
            loadAdminArticlesList();
            loadHomepagePosts();
          }
        } catch (e) {
          alert('Error toggling post visibility');
        }
      });
    });

    container.querySelectorAll('.admin-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        if (!confirm(`Are you sure you want to permanently delete:\n"${title}"?`)) return;

        btn.disabled = true;
        try {
          const token = sessionStorage.getItem('adminToken') || '';
          const res = await fetch('/api/admin/post/delete', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
          });
          const data = await res.json();
          if (data.success) {
            logMessage(`🗑️ Article deleted: "${title}"`);
            cachedPosts = []; // Clear homepage cache
            loadAdminArticlesList();
            loadHomepagePosts();
          }
        } catch (e) {
          alert('Error deleting post');
        }
      });
    });
  }

  // Bind Admin Search & Show Per Page Dropdown Listeners
  const adminSearchInput = document.getElementById('adminArticleSearchInput');
  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', (e) => {
      adminSearchQuery = e.target.value;
      renderAdminArticlesList();
    });
  }

  const adminPerPageSelect = document.getElementById('adminArticlesPerPageSelect');
  if (adminPerPageSelect) {
    adminPerPageSelect.addEventListener('change', (e) => {
      adminPerPage = e.target.value;
      renderAdminArticlesList();
    });
  }

  // Gemini AI Key Handlers
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const saveGeminiBtn = document.getElementById('saveGeminiKeyBtn');
  const geminiStatus = document.getElementById('geminiKeyStatus');

  async function loadGeminiKeyStatus() {
    if (!geminiStatus) return;
    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch('/api/gemini-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.hasKey) {
        geminiStatus.innerHTML = `✅ Gemini AI Active (${data.maskedKey}) • <strong>Writing 1,500-Word Deep Stories</strong>`;
        if (geminiInput) geminiInput.placeholder = `Active Key: ${data.maskedKey} (Paste new to update)`;
      } else {
        geminiStatus.innerHTML = `⚠️ No Gemini Key Configured. <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #2563EB; font-weight: 700;">Get Free Key from Google AI Studio ➔</a>`;
      }
    } catch (e) {}
  }

  if (saveGeminiBtn) {
    saveGeminiBtn.addEventListener('click', async () => {
      const apiKey = geminiInput ? geminiInput.value.trim() : '';
      if (!apiKey) return alert('Please paste your Gemini API key!');

      saveGeminiBtn.disabled = true;
      saveGeminiBtn.innerText = '⌛ Saving Key...';

      try {
        const token = sessionStorage.getItem('adminToken') || '';
        const res = await fetch('/api/gemini-key', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();

        if (data.success) {
          logMessage('✅ Gemini AI API Key saved & activated for 1,500-word deep story writing!');
          alert('Gemini AI API Key saved successfully!');
          if (geminiInput) geminiInput.value = '';
          loadGeminiKeyStatus();
        } else {
          alert(data.error || 'Failed to save Gemini key');
        }
      } catch (e) {
        alert('Connection error saving key');
      } finally {
        saveGeminiBtn.disabled = false;
        saveGeminiBtn.innerText = '💾 Save Gemini Key';
      }
    });
  }

  function logMessage(msg) {
    if (logsPre) {
      const timestamp = new Date().toLocaleTimeString();
      logsPre.innerText += `\n[${timestamp}] ${msg}`;
      logsPre.scrollTop = logsPre.scrollHeight;
    }
  }

  // Initial Auth Check
  checkAdminAuth();

  // 1. Auto-Publisher Button Handler
  if (triggerBtn) {
    triggerBtn.addEventListener('click', async () => {
      const topic = topicInput ? topicInput.value.trim() : '';
      triggerBtn.disabled = true;
      triggerBtn.innerText = '⌛ Scanning & Publishing Story...';
      if (triggerStatus) triggerStatus.innerText = '⚡ Fetching trends, real Serper photos & writing article...';

      logMessage(`Initiated story generation ${topic ? `for topic: "${topic}"` : 'from live global news'}...`);

      try {
        const token = sessionStorage.getItem('adminToken') || '';
        const res = await fetch('/api/trigger-autoblog', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ topic })
        });
        const data = await res.json();

        if (data.success && data.post) {
          const p = data.post;
          logMessage(`✅ Successfully Published: "${p.title}"`);
          if (triggerStatus) {
            triggerStatus.innerHTML = `✅ Published! <a href="/post/${p.slug}" target="_blank" style="color: #2563EB; font-weight: 700; text-decoration: underline;">View Published Story ➔</a>`;
          }
          if (topicInput) topicInput.value = '';
          loadSerperKeysAndCredits();
        } else {
          logMessage(`❌ Error: ${data.error || 'Failed to auto-generate'}`);
          if (triggerStatus) triggerStatus.innerText = `❌ ${data.error || 'Error generating article.'}`;
          alert(`❌ Gemini AI Error:\n\n${data.error || 'Unknown error'}\n\nFix: Go to Admin Panel → Gemini AI Key → Save a fresh key from aistudio.google.com/app/apikey`);
        }
      } catch (e) {
        logMessage(`❌ Connection Error: ${e.message}`);
        if (triggerStatus) triggerStatus.innerText = '❌ Connection error.';
      } finally {
        triggerBtn.disabled = false;
        triggerBtn.innerText = '🚀 Auto-Generate & Publish Story Now';
      }
    });
  }

  // 2. Load Dynamic Serper Keys with Live Credit Meter
  async function loadSerperKeysAndCredits() {
    if (!keysContainer) return;

    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch('/api/serper-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      keysContainer.innerHTML = '';

      if (data.success && data.keyDetails && data.keyDetails.length > 0) {
        let totalRemaining = 0;
        data.keyDetails.forEach((item, index) => {
          totalRemaining += item.balance;
          createKeyRow(item.key, index + 1, item.balance, item.used, item.status);
        });

        if (serperKeysStatus) {
          serperKeysStatus.innerHTML = `🔑 <strong>${data.keyDetails.length} Key(s) Configured</strong> • Total Credits Remaining: <strong>${totalRemaining.toLocaleString()}</strong>`;
        }
      } else {
        createKeyRow('', 1, 2500, 0, 'READY');
        if (serperKeysStatus) serperKeysStatus.innerText = 'No API Keys configured. Add your first Serper key above.';
      }
    } catch (e) {
      console.error('Error loading Serper keys:', e);
    }
  }

  function createKeyRow(keyValue = '', indexNumber = 1, balance = 2500, used = 0, status = 'READY') {
    const row = document.createElement('div');
    row.className = 'key-row';

    let badgeClass = 'badge-ready';
    if (status.includes('ACTIVE')) badgeClass = 'badge-active';
    if (status.includes('EXHAUSTED')) badgeClass = 'badge-exhausted';

    row.innerHTML = `
      <div style="font-weight: 700; font-size: 0.85rem; width: 65px; color: #475569;">Key #${indexNumber}:</div>
      <input type="text" class="key-input" value="${escapeHtml(keyValue)}" placeholder="Paste Serper API Key (e.g. 0be094de...)" />
      
      <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 140px;">
        <span class="key-badge ${badgeClass}">${status}</span>
        <div style="font-size: 0.725rem; color: #64748B; margin-top: 0.2rem;">
          Remaining: <strong>${balance}</strong> | Used: <strong>${used}</strong>
        </div>
      </div>

      <button type="button" class="remove-key-btn" style="background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;" title="Remove this key">🗑️</button>
    `;

    row.querySelector('.remove-key-btn').addEventListener('click', () => {
      row.remove();
      updateKeyRowNumbers();
    });

    keysContainer.appendChild(row);
  }

  function updateKeyRowNumbers() {
    const rows = keysContainer.querySelectorAll('.key-row');
    rows.forEach((r, idx) => {
      const label = r.querySelector('div');
      if (label) label.innerText = `Key #${idx + 1}:`;
    });
  }

  if (addKeyBtn) {
    addKeyBtn.addEventListener('click', () => {
      const currentCount = keysContainer.querySelectorAll('.key-row').length;
      createKeyRow('', currentCount + 1, 2500, 0, 'READY');
      logMessage(`Added Key #${currentCount + 1} input row.`);
    });
  }

  if (saveSerperKeysBtn) {
    saveSerperKeysBtn.addEventListener('click', async () => {
      const inputs = keysContainer.querySelectorAll('.key-input');
      const keysList = [];
      inputs.forEach(i => {
        if (i.value.trim().length > 5) keysList.push(i.value.trim());
      });

      saveSerperKeysBtn.disabled = true;
      saveSerperKeysBtn.innerText = '⌛ Updating API Pool...';

      try {
        const token = sessionStorage.getItem('adminToken') || '';
        const res = await fetch('/api/serper-keys', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ keys: keysList })
        });
        const data = await res.json();

        if (data.success) {
          logMessage(`✓ Successfully saved & updated ${data.count} Serper API Key(s)!`);
          alert(`Successfully saved ${data.count} Serper API Key(s) to pool!`);
          loadSerperKeysAndCredits();
        }
      } catch (e) {
        logMessage(`❌ Error saving keys: ${e.message}`);
      } finally {
        saveSerperKeysBtn.disabled = false;
        saveSerperKeysBtn.innerText = '💾 Save & Update All API Keys';
      }
    });
  }

  // Telegram Auto-Poster Admin Handlers
  const telegramConfigForm = document.getElementById('telegramConfigForm');
  const telegramBotTokenInput = document.getElementById('telegramBotTokenInput');
  const telegramChannelIdInput = document.getElementById('telegramChannelIdInput');
  const telegramAutoPostToggle = document.getElementById('telegramAutoPostToggle');
  const testTelegramPostBtn = document.getElementById('testTelegramPostBtn');
  const telegramStatus = document.getElementById('telegramStatus');

  async function loadTelegramConfig() {
    if (!telegramBotTokenInput) return;
    try {
      const res = await fetch('/api/telegram-config');
      const data = await res.json();
      if (data.success && data.config) {
        telegramBotTokenInput.value = data.config.botToken || '';
        telegramChannelIdInput.value = data.config.channelId || '';
        telegramAutoPostToggle.checked = !!data.config.autoPostEnabled;
      }
    } catch (e) {
      console.error('Error loading Telegram config:', e);
    }
  }

  if (telegramConfigForm) {
    telegramConfigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (telegramStatus) telegramStatus.innerText = '⌛ Saving...';
      try {
        const res = await fetch('/api/save-telegram-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: telegramBotTokenInput.value.trim(),
            channelId: telegramChannelIdInput.value.trim(),
            autoPostEnabled: telegramAutoPostToggle.checked
          })
        });
        const data = await res.json();
        if (data.success) {
          if (telegramStatus) {
            telegramStatus.style.color = '#059669';
            telegramStatus.innerText = '✓ Telegram Settings Saved!';
          }
          logMessage('✓ Telegram Auto-Poster settings saved!');
        } else {
          if (telegramStatus) {
            telegramStatus.style.color = '#DC2626';
            telegramStatus.innerText = '❌ Failed to save Telegram settings.';
          }
        }
      } catch (err) {
        if (telegramStatus) {
          telegramStatus.style.color = '#DC2626';
          telegramStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  if (testTelegramPostBtn) {
    testTelegramPostBtn.addEventListener('click', async () => {
      if (telegramStatus) telegramStatus.innerText = '⌛ Sending test post...';
      try {
        const res = await fetch('/api/test-telegram-post', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (telegramStatus) {
            telegramStatus.style.color = '#059669';
            telegramStatus.innerText = '✓ Test Post Sent to Telegram Channel!';
          }
          alert('✓ Test post successfully sent to Telegram Channel!');
          logMessage('✓ Test post sent to Telegram Channel!');
        } else {
          if (telegramStatus) {
            telegramStatus.style.color = '#DC2626';
            telegramStatus.innerText = `❌ ${data.message}`;
          }
          alert(`❌ Telegram Test Failed: ${data.message}`);
        }
      } catch (err) {
        if (telegramStatus) {
          telegramStatus.style.color = '#DC2626';
          telegramStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  loadTelegramConfig();

  // Twitter / X Auto-Poster Admin Handlers
  const twitterConfigForm = document.getElementById('twitterConfigForm');
  const twitterApiKeyInput = document.getElementById('twitterApiKeyInput');
  const twitterApiSecretInput = document.getElementById('twitterApiSecretInput');
  const twitterAccessTokenInput = document.getElementById('twitterAccessTokenInput');
  const twitterAccessSecretInput = document.getElementById('twitterAccessSecretInput');
  const twitterAutoPostToggle = document.getElementById('twitterAutoPostToggle');
  const testTwitterPostBtn = document.getElementById('testTwitterPostBtn');
  const twitterStatus = document.getElementById('twitterStatus');

  async function loadTwitterConfig() {
    if (!twitterApiKeyInput) return;
    try {
      const res = await fetch('/api/twitter-config');
      const data = await res.json();
      if (data.success && data.config) {
        twitterApiKeyInput.value = data.config.apiKey || '';
        twitterApiSecretInput.value = data.config.apiSecret || '';
        twitterAccessTokenInput.value = data.config.accessToken || '';
        twitterAccessSecretInput.value = data.config.accessSecret || '';
        twitterAutoPostToggle.checked = !!data.config.autoPostEnabled;
      }
    } catch (e) {
      console.error('Error loading Twitter config:', e);
    }
  }

  if (twitterConfigForm) {
    twitterConfigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (twitterStatus) twitterStatus.innerText = '⌛ Saving...';
      try {
        const res = await fetch('/api/save-twitter-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: twitterApiKeyInput.value.trim(),
            apiSecret: twitterApiSecretInput.value.trim(),
            accessToken: twitterAccessTokenInput.value.trim(),
            accessSecret: twitterAccessSecretInput.value.trim(),
            autoPostEnabled: twitterAutoPostToggle.checked
          })
        });
        const data = await res.json();
        if (data.success) {
          if (twitterStatus) {
            twitterStatus.style.color = '#059669';
            twitterStatus.innerText = '✓ Twitter Settings Saved!';
          }
          logMessage('✓ Twitter Auto-Poster settings saved!');
        } else {
          if (twitterStatus) {
            twitterStatus.style.color = '#DC2626';
            twitterStatus.innerText = '❌ Failed to save Twitter settings.';
          }
        }
      } catch (err) {
        if (twitterStatus) {
          twitterStatus.style.color = '#DC2626';
          twitterStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  if (testTwitterPostBtn) {
    testTwitterPostBtn.addEventListener('click', async () => {
      if (twitterStatus) twitterStatus.innerText = '⌛ Sending test tweet to X...';
      try {
        const res = await fetch('/api/test-twitter-post', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (twitterStatus) {
            twitterStatus.style.color = '#059669';
            twitterStatus.innerText = '✓ Test Tweet Sent to Twitter/X!';
          }
          alert(`✓ Test Tweet successfully posted to X!\n${data.message}`);
          logMessage('✓ Test Tweet sent to X!');
        } else {
          if (twitterStatus) {
            twitterStatus.style.color = '#DC2626';
            twitterStatus.innerText = `❌ ${data.message}`;
          }
          alert(`❌ Twitter Test Failed: ${data.message}`);
        }
      } catch (err) {
        if (twitterStatus) {
          twitterStatus.style.color = '#DC2626';
          twitterStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  loadTwitterConfig();

  // Custom Direct Cookie Twitter Bot Admin Handlers
  const customTwitterConfigForm = document.getElementById('customTwitterConfigForm');
  const customAuthTokenInput = document.getElementById('customAuthTokenInput');
  const customCsrfTokenInput = document.getElementById('customCsrfTokenInput');
  const customTwitterAutoPostToggle = document.getElementById('customTwitterAutoPostToggle');
  const testCustomTwitterPostBtn = document.getElementById('testCustomTwitterPostBtn');
  const customTwitterStatus = document.getElementById('customTwitterStatus');

  async function loadCustomTwitterConfig() {
    if (!customAuthTokenInput) return;
    try {
      const res = await fetch('/api/custom-twitter-config');
      const data = await res.json();
      if (data.success && data.config) {
        customAuthTokenInput.value = data.config.authToken || '';
        customCsrfTokenInput.value = data.config.csrfToken || '';
        customTwitterAutoPostToggle.checked = !!data.config.autoPostEnabled;
      }
    } catch (e) {
      console.error('Error loading Custom Twitter config:', e);
    }
  }

  const saveCustomTwitterConfigBtn = document.getElementById('saveCustomTwitterConfigBtn');

  async function handleSaveCustomTwitterConfig(e) {
    if (e) e.preventDefault();
    if (customTwitterStatus) customTwitterStatus.innerText = '⌛ Saving...';
    try {
      const res = await fetch('/api/save-custom-twitter-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authToken: customAuthTokenInput.value.trim(),
          csrfToken: customCsrfTokenInput.value.trim(),
          autoPostEnabled: customTwitterAutoPostToggle.checked
        })
      });
      const data = await res.json();
      if (data.success) {
        if (customTwitterStatus) {
          customTwitterStatus.style.color = '#059669';
          customTwitterStatus.innerText = '✓ Custom Twitter Bot Cookies Saved!';
        }
        alert('✓ Custom Twitter Bot Cookies Saved Successfully!');
        logMessage('✓ Custom Twitter Bot cookies saved!');
      } else {
        if (customTwitterStatus) {
          customTwitterStatus.style.color = '#DC2626';
          customTwitterStatus.innerText = '❌ Failed to save Custom Bot cookies.';
        }
      }
    } catch (err) {
      if (customTwitterStatus) {
        customTwitterStatus.style.color = '#DC2626';
        customTwitterStatus.innerText = `❌ Error: ${err.message}`;
      }
    }
  }

  if (saveCustomTwitterConfigBtn) {
    saveCustomTwitterConfigBtn.addEventListener('click', handleSaveCustomTwitterConfig);
  }

  if (customTwitterConfigForm) {
    customTwitterConfigForm.addEventListener('submit', handleSaveCustomTwitterConfig);
  }

  if (testCustomTwitterPostBtn) {
    testCustomTwitterPostBtn.addEventListener('click', async () => {
      if (customTwitterStatus) customTwitterStatus.innerText = '⌛ Sending test tweet via Custom Bot...';
      try {
        const res = await fetch('/api/test-custom-twitter-post', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (customTwitterStatus) {
            customTwitterStatus.style.color = '#059669';
            customTwitterStatus.innerText = '✓ Test Tweet Sent via Custom Bot!';
          }
          alert(`✓ Test Tweet successfully posted via Custom Server Bot!\n${data.message}`);
          logMessage('✓ Test Tweet sent via Custom Bot!');
        } else {
          if (customTwitterStatus) {
            customTwitterStatus.style.color = '#DC2626';
            customTwitterStatus.innerText = `❌ ${data.message}`;
          }
          alert(`❌ Custom Twitter Bot Test Failed: ${data.message}`);
        }
      } catch (err) {
        if (customTwitterStatus) {
          customTwitterStatus.style.color = '#DC2626';
          customTwitterStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  loadCustomTwitterConfig();

  // Reddit Subreddit Auto-Poster Admin Handlers
  const redditConfigForm = document.getElementById('redditConfigForm');
  const redditClientIdInput = document.getElementById('redditClientIdInput');
  const redditClientSecretInput = document.getElementById('redditClientSecretInput');
  const redditUsernameInput = document.getElementById('redditUsernameInput');
  const redditPasswordInput = document.getElementById('redditPasswordInput');
  const redditSubredditInput = document.getElementById('redditSubredditInput');
  const redditAutoPostToggle = document.getElementById('redditAutoPostToggle');
  const saveRedditConfigBtn = document.getElementById('saveRedditConfigBtn');
  const testRedditPostBtn = document.getElementById('testRedditPostBtn');
  const redditStatus = document.getElementById('redditStatus');

  async function loadRedditConfig() {
    if (!redditClientIdInput) return;
    try {
      const res = await fetch('/api/reddit-config');
      const data = await res.json();
      if (data.success && data.config) {
        redditClientIdInput.value = data.config.clientId || '';
        redditClientSecretInput.value = data.config.clientSecret || '';
        redditUsernameInput.value = data.config.username || '';
        redditPasswordInput.value = data.config.password || '';
        redditSubredditInput.value = data.config.subreddit || '';
        redditAutoPostToggle.checked = !!data.config.autoPostEnabled;
      }
    } catch (e) {
      console.error('Error loading Reddit config:', e);
    }
  }

  async function handleSaveRedditConfig(e) {
    if (e) e.preventDefault();
    if (redditStatus) redditStatus.innerText = '⌛ Saving Reddit Settings...';
    try {
      const res = await fetch('/api/save-reddit-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: redditClientIdInput.value.trim(),
          clientSecret: redditClientSecretInput.value.trim(),
          username: redditUsernameInput.value.trim(),
          password: redditPasswordInput.value.trim(),
          subreddit: redditSubredditInput.value.trim(),
          autoPostEnabled: redditAutoPostToggle.checked
        })
      });
      const data = await res.json();
      if (data.success) {
        if (redditStatus) {
          redditStatus.style.color = '#059669';
          redditStatus.innerText = '✓ Reddit Settings Saved!';
        }
        alert('✓ Reddit Auto-Poster Settings Saved Successfully!');
        logMessage('✓ Reddit Auto-Poster settings saved!');
      } else {
        if (redditStatus) {
          redditStatus.style.color = '#DC2626';
          redditStatus.innerText = '❌ Failed to save Reddit settings.';
        }
      }
    } catch (err) {
      if (redditStatus) {
        redditStatus.style.color = '#DC2626';
        redditStatus.innerText = `❌ Error: ${err.message}`;
      }
    }
  }

  if (saveRedditConfigBtn) saveRedditConfigBtn.addEventListener('click', handleSaveRedditConfig);
  if (redditConfigForm) redditConfigForm.addEventListener('submit', handleSaveRedditConfig);

  if (testRedditPostBtn) {
    testRedditPostBtn.addEventListener('click', async () => {
      if (redditStatus) redditStatus.innerText = '⌛ Sending test post to Reddit...';
      try {
        const res = await fetch('/api/test-reddit-post', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (redditStatus) {
            redditStatus.style.color = '#059669';
            redditStatus.innerText = '✓ Test Post Sent to Reddit!';
          }
          alert(`✓ Test Post successfully posted to Reddit!\n${data.message}`);
          logMessage('✓ Test Post sent to Reddit!');
        } else {
          if (redditStatus) {
            redditStatus.style.color = '#DC2626';
            redditStatus.innerText = `❌ ${data.message}`;
          }
          alert(`❌ Reddit Bot Test Failed: ${data.message}`);
        }
      } catch (err) {
        if (redditStatus) {
          redditStatus.style.color = '#DC2626';
          redditStatus.innerText = `❌ Error: ${err.message}`;
        }
      }
    });
  }

  loadRedditConfig();

  async function loadAnalytics() {
    if (!topTopicsList || !countryTrafficList) return;

    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const res = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        if (statTotalViews && typeof data.totalMonthlyViews !== 'undefined') statTotalViews.innerText = data.totalMonthlyViews;
        if (statTotalArticles) statTotalArticles.innerText = adminAllPosts.length;

        topTopicsList.innerHTML = '';
        if (data.topTopics && data.topTopics.length > 0) {
          data.topTopics.forEach(t => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;';
            div.innerHTML = `
              <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <strong>${escapeHtml(t.title)}</strong>
                <div style="font-size: 0.725rem; color: #64748B;">Category: ${escapeHtml(t.category)}</div>
              </div>
              <div style="text-align: right; min-width: 90px; font-weight: 700; color: #2563EB;">
                👁️ ${t.views.toLocaleString()}
              </div>
            `;
            topTopicsList.appendChild(div);
          });
        } else {
          topTopicsList.innerHTML = `<div style="color: #64748B; padding: 1rem 0; text-align: center;">⚡ Real-Time Article Tracking Active...</div>`;
        }

        countryTrafficList.innerHTML = '';
        if (data.countryTraffic && data.countryTraffic.length > 0) {
          data.countryTraffic.forEach(c => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;';
            div.innerHTML = `
              <div>
                <strong>${escapeHtml(c.country)}</strong>
                <div style="font-size: 0.725rem; color: #64748B;">Page Views: ${c.pageViews}</div>
              </div>
              <div style="font-weight: 700; color: #059669; font-size: 0.95rem;">
                ${c.percent}
              </div>
            `;
            countryTrafficList.appendChild(div);
          });
        } else {
          countryTrafficList.innerHTML = `<div style="color: #64748B; padding: 1.25rem 0; text-align: center;">⚡ Real-Time IP Tracking Active<br/><small style="font-size: 0.8rem; color: #94A3B8;">Country views update dynamically as live readers visit your site.</small></div>`;
        }
      }
    } catch (e) {
      console.error('Error loading analytics:', e);
    }
  }

  loadSerperKeysAndCredits();
  loadAnalytics();
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.togglePassVisibility = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (input) {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btnEl) btnEl.innerText = isPass ? '🙈' : '👁️';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('postsGrid')) {
    loadHomepagePosts();
    initCategoryFilter();
  }
  if (document.getElementById('postContent')) {
    loadSingleArticle();
  }
  if (document.getElementById('triggerAutoBlogBtn') || document.getElementById('saveSerperKeysBtn')) {
    initAdminPanel();
  }
});
