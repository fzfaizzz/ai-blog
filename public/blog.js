// Client JavaScript for The Daily Chronicle

const HUMAN_AUTHORS = [
  { name: 'Sarah Jenkins', role: 'Senior Tech Correspondent', initials: 'SJ' },
  { name: 'David Chen', role: 'Global Markets Analyst', initials: 'DC' },
  { name: 'Elena Rostova', role: 'Innovation & Science Editor', initials: 'ER' },
  { name: 'Marcus Vance', role: 'Executive Editor', initials: 'MV' }
];

// Load Homepage Grid Posts & Featured Magazine Hero with Category Filtering
async function loadHomepagePosts(selectedCategory = 'ALL') {
  const postsGrid = document.getElementById('postsGrid');
  const featuredStory = document.getElementById('featuredStory');
  const trendingSidebarList = document.getElementById('trendingSidebarList');
  const headerTitle = document.getElementById('reportingHeaderTitle');

  if (!postsGrid) return;

  if (headerTitle) {
    headerTitle.innerText = selectedCategory === 'ALL' 
      ? 'LATEST REPORTING — ALL HEADLINES' 
      : `LATEST REPORTING — ${selectedCategory.toUpperCase()}`;
  }

  try {
    const res = await fetch('/api/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      const posts = selectedCategory === 'ALL' 
        ? data.posts 
        : data.posts.filter(p => (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase()) || (p.title || '').toLowerCase().includes(selectedCategory.toLowerCase()));

      const displayPosts = posts.length > 0 ? posts : data.posts;

      // 1. Featured Lead Magazine Story
      if (featuredStory && displayPosts[0]) {
        const lead = displayPosts[0];
        const author = HUMAN_AUTHORS[0];
        featuredStory.innerHTML = `
          <span class="featured-badge">${lead.category || 'WORLD BREAKING'}</span>
          <a href="post.html?slug=${lead.slug}">
            <img src="${lead.imageUrl}" alt="${escapeHtml(lead.title)}" />
          </a>
          <h2><a href="post.html?slug=${lead.slug}">${escapeHtml(lead.title)}</a></h2>
          <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 1rem;">${escapeHtml(lead.metaDescription)}</p>
          <div style="font-size: 0.85rem; color: var(--text-subtle); font-weight: 600;">
            By <strong>${author.name}</strong> • ${new Date(lead.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        `;
      }

      // 2. Trending Sidebar Items
      if (trendingSidebarList && displayPosts.length > 1) {
        trendingSidebarList.innerHTML = '';
        displayPosts.slice(1, 4).forEach(item => {
          const div = document.createElement('div');
          div.className = 'trending-sidebar-item';
          div.innerHTML = `
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-blue); text-transform: uppercase;">${item.category || 'ANALYSIS'}</span>
            <h4><a href="post.html?slug=${item.slug}">${escapeHtml(item.title)}</a></h4>
          `;
          trendingSidebarList.appendChild(div);
        });
      }

      // 3. Main Reporting Grid
      postsGrid.innerHTML = '';
      const gridPosts = displayPosts.length > 4 ? displayPosts.slice(1) : displayPosts;
      gridPosts.forEach((post, index) => {
        const author = HUMAN_AUTHORS[(index + 1) % HUMAN_AUTHORS.length];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <a href="post.html?slug=${post.slug}">
            <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="card-img" />
          </a>
          <div class="card-body">
            <div class="card-category">${escapeHtml(post.category || 'REPORTING')}</div>
            <h3 class="card-title">
              <a href="post.html?slug=${post.slug}">${escapeHtml(post.title)}</a>
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
    } else {
      postsGrid.innerHTML = '<div style="color: var(--text-subtle);">No published articles found in this category.</div>';
    }
  } catch (e) {
    postsGrid.innerHTML = `<div style="color: var(--text-subtle);">Error loading articles: ${e.message}</div>`;
  }
}

// Bind Category Navigation Click Listeners
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

      // Load Filtered Posts
      loadHomepagePosts(targetCat);
    });
  });
}

// Load Single Article Page
async function loadSingleArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) return;

  try {
    const res = await fetch(`/api/post/${slug}`);
    const data = await res.json();

    if (data.success && data.post) {
      const p = data.post;
      const author = HUMAN_AUTHORS[Math.abs(hashString(p.slug)) % HUMAN_AUTHORS.length];

      if (document.getElementById('pageTitle')) document.getElementById('pageTitle').innerText = `${p.title} — The Daily Chronicle`;
      if (document.getElementById('metaDesc')) document.getElementById('metaDesc').content = p.metaDescription;
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

      // Inject Native In-Article Ads after 1st H2 heading and after 3rd H2 heading
      let h2Count = 0;
      html = html.replace(/<h2>/g, (match) => {
        h2Count++;
        if (h2Count === 2 || h2Count === 4) {
          return `${inArticleAdHtml}<h2>`;
        }
        return match;
      });

      if (document.getElementById('postContent')) document.getElementById('postContent').innerHTML = html;
    }
  } catch (e) {
    console.error('Error loading article:', e);
  }
}

// Admin Control Panel Handlers
function initAdminPanel() {
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
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

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

      if (!currentPassword || !newPassword) return;

      if (changePassStatus) changePassStatus.innerText = '⌛ Updating password...';

      try {
        const res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();

        if (data.success) {
          if (changePassStatus) {
            changePassStatus.style.color = '#059669';
            changePassStatus.innerText = '✅ Password updated successfully!';
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
    loadSerperKeysAndCredits();
    loadRealAnalyticsData();
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
        const res = await fetch('/api/trigger-autoblog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic })
        });
        const data = await res.json();

        if (data.success && data.post) {
          const p = data.post;
          logMessage(`✅ Successfully Published: "${p.title}"`);
          if (triggerStatus) {
            triggerStatus.innerHTML = `✅ Published! <a href="post.html?slug=${p.slug}" target="_blank" style="color: #2563EB; font-weight: 700; text-decoration: underline;">View Published Story ➔</a>`;
          }
          if (topicInput) topicInput.value = '';
          loadSerperKeysAndCredits();
        } else {
          logMessage(`❌ Error: ${data.error || 'Failed to auto-generate'}`);
          if (triggerStatus) triggerStatus.innerText = '❌ Error generating article.';
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
      const res = await fetch('/api/serper-keys');
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
        const res = await fetch('/api/serper-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  async function loadAnalytics() {
    if (!topTopicsList || !countryTrafficList) return;

    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();

      if (data.success) {
        topTopicsList.innerHTML = '';
        data.topTopics.forEach(t => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;';
          div.innerHTML = `
            <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <strong>${escapeHtml(t.title)}</strong>
              <div style="font-size: 0.725rem; color: #64748B;">Category: ${t.category}</div>
            </div>
            <div style="text-align: right; min-width: 90px; font-weight: 700; color: #2563EB;">
              👁️ ${t.views.toLocaleString()}
            </div>
          `;
          topTopicsList.appendChild(div);
        });

        countryTrafficList.innerHTML = '';
        data.countryTraffic.forEach(c => {
          const div = document.createElement('div');
          div.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;';
          div.innerHTML = `
            <div>
              <strong>${c.country}</strong>
              <div style="font-size: 0.725rem; color: #64748B;">Page Views: ${c.pageViews}</div>
            </div>
            <div style="font-weight: 700; color: #059669; font-size: 0.95rem;">
              ${c.percent}
            </div>
          `;
          countryTrafficList.appendChild(div);
        });
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
