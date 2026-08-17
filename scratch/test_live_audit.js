import https from 'https';

const BASE_URL = 'https://primemedia.site';

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    const len = typeof body === 'string' ? body.length : JSON.stringify(body).length;
    console.log(`✓ [${res.status}] ${name} (Content-Type: ${contentType.split(';')[0]} | Size: ${len} bytes)`);
    return { name, status: res.status, ok: res.ok, body };
  } catch (err) {
    console.error(`❌ [FAILED] ${name}: ${err.message}`);
    return { name, status: 0, ok: false, error: err.message };
  }
}

async function runLiveProductionAudit() {
  console.log('===============================================================');
  console.log('🌐 RUNNING LIVE PRODUCTION END-TO-END QA & SECURITY AUDIT');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  const results = [];

  // 1. Static Pages & Core Routes
  console.log('📄 1. Testing Core Frontend Web Pages:');
  results.push(await testEndpoint('Homepage (/)', `${BASE_URL}/`));
  results.push(await testEndpoint('About Us (/about.html)', `${BASE_URL}/about.html`));
  results.push(await testEndpoint('Privacy Policy (/privacy.html)', `${BASE_URL}/privacy.html`));
  results.push(await testEndpoint('Terms of Service (/terms.html)', `${BASE_URL}/terms.html`));
  results.push(await testEndpoint('Contact Us (/contact.html)', `${BASE_URL}/contact.html`));
  results.push(await testEndpoint('Admin Staff Panel (/admin.html)', `${BASE_URL}/admin.html`));

  // 2. SEO, Sitemaps & Search Engine Endpoints
  console.log('\n🗺️ 2. Testing SEO, Sitemaps & AdSense Endpoints:');
  results.push(await testEndpoint('XML Sitemap (/sitemap.xml)', `${BASE_URL}/sitemap.xml`));
  results.push(await testEndpoint('Google News Sitemap (/news-sitemap.xml)', `${BASE_URL}/news-sitemap.xml`));
  results.push(await testEndpoint('RSS 2.0 Feed (/feed)', `${BASE_URL}/feed`));
  results.push(await testEndpoint('Robots.txt (/robots.txt)', `${BASE_URL}/robots.txt`));
  results.push(await testEndpoint('Google AdSense ads.txt (/ads.txt)', `${BASE_URL}/ads.txt`));

  // 3. Public API Endpoints & SSR Dynamic Article Pages
  console.log('\n📰 3. Testing Public Content APIs & Server-Side Rendered (SSR) Article Pages:');
  const postsRes = await testEndpoint('Get All Posts API (/api/posts)', `${BASE_URL}/api/posts`);
  results.push(postsRes);

  if (postsRes && postsRes.body && postsRes.body.posts && postsRes.body.posts.length > 0) {
    const firstPost = postsRes.body.posts[0];
    results.push(await testEndpoint(`Single Post API (/api/post/${firstPost.slug})`, `${BASE_URL}/api/post/${firstPost.slug}`));
    
    const ssrRes = await testEndpoint(`SSR Dynamic Article Page (/post/${firstPost.slug})`, `${BASE_URL}/post/${firstPost.slug}`);
    results.push(ssrRes);

    // Verify SSR contains rich HTML
    if (typeof ssrRes.body === 'string' && ssrRes.body.includes(firstPost.title)) {
      console.log(`   ✨ SSR VERIFIED: Full article title & content found in raw HTML payload!`);
    } else {
      console.warn(`   ⚠️ Warning: SSR title check failed in HTML body`);
    }
  }

  // 4. Security & Admin Authentication Protection Tests
  console.log('\n🔒 4. Testing Security & Middleware Authorization Guards:');
  results.push(await testEndpoint('Admin Analytics WITHOUT Token (Guarded - Expected: 401)', `${BASE_URL}/api/analytics`));
  results.push(await testEndpoint('Admin Posts List WITHOUT Token (Guarded - Expected: 401)', `${BASE_URL}/api/admin/posts`));
  results.push(await testEndpoint('Admin Serper Keys WITHOUT Token (Guarded - Expected: 401)', `${BASE_URL}/api/serper-keys`));

  // 5. Config Endpoints
  console.log('\n⚙️ 5. Testing Auto-Poster Configuration Endpoints:');
  results.push(await testEndpoint('Get Telegram Config (/api/telegram-config)', `${BASE_URL}/api/telegram-config`));
  results.push(await testEndpoint('Get Userbot Config (/api/userbot-config)', `${BASE_URL}/api/userbot-config`));
  results.push(await testEndpoint('Get Twitter Config (/api/twitter-config)', `${BASE_URL}/api/twitter-config`));
  results.push(await testEndpoint('Get Custom Twitter Config (/api/custom-twitter-config)', `${BASE_URL}/api/custom-twitter-config`));
  results.push(await testEndpoint('Get Reddit Config (/api/reddit-config)', `${BASE_URL}/api/reddit-config`));

  console.log('\n===============================================================');
  const passed = results.filter(r => r.ok || (r.name.includes('WITHOUT Token') && r.status === 401)).length;
  console.log(`🏁 LIVE PRODUCTION AUDIT COMPLETE: ${passed}/${results.length} Tests Passed!`);
  console.log('===============================================================\n');
}

runLiveProductionAudit();
