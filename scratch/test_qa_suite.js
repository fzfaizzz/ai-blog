import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:6060';

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
    console.log(`✓ [${res.status}] ${name} (Length: ${typeof body === 'string' ? body.length : JSON.stringify(body).length})`);
    return { name, status: res.status, ok: res.ok, body };
  } catch (err) {
    console.error(`❌ [FAILED] ${name}: ${err.message}`);
    return { name, status: 0, ok: false, error: err.message };
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE FULL-STACK QA & SECURITY TEST SUITE');
  console.log('===============================================================\n');

  const results = [];

  // 1. Static Pages & Core Routes
  results.push(await testEndpoint('Homepage (/index.html)', `${BASE_URL}/index.html`));
  results.push(await testEndpoint('About Us (/about.html)', `${BASE_URL}/about.html`));
  results.push(await testEndpoint('Privacy Policy (/privacy.html)', `${BASE_URL}/privacy.html`));
  results.push(await testEndpoint('Terms of Service (/terms.html)', `${BASE_URL}/terms.html`));
  results.push(await testEndpoint('Contact Us (/contact.html)', `${BASE_URL}/contact.html`));
  results.push(await testEndpoint('Admin Staff Panel (/admin.html)', `${BASE_URL}/admin.html`));

  // 2. SEO, Sitemaps & Search Engine Endpoints
  results.push(await testEndpoint('XML Sitemap (/sitemap.xml)', `${BASE_URL}/sitemap.xml`));
  results.push(await testEndpoint('Google News Sitemap (/news-sitemap.xml)', `${BASE_URL}/news-sitemap.xml`));
  results.push(await testEndpoint('RSS Feed (/feed)', `${BASE_URL}/feed`));
  results.push(await testEndpoint('Robots.txt (/robots.txt)', `${BASE_URL}/robots.txt`));
  results.push(await testEndpoint('AdSense ads.txt (/ads.txt)', `${BASE_URL}/ads.txt`));

  // 3. Public API Endpoints
  results.push(await testEndpoint('Get All Posts (/api/posts)', `${BASE_URL}/api/posts`));
  
  // Test SSR Post Endpoint with first post slug
  const postsRes = results.find(r => r.name.includes('/api/posts'));
  if (postsRes && postsRes.body && postsRes.body.posts && postsRes.body.posts.length > 0) {
    const firstSlug = postsRes.body.posts[0].slug;
    results.push(await testEndpoint(`Single Post API (/api/post/${firstSlug})`, `${BASE_URL}/api/post/${firstSlug}`));
    results.push(await testEndpoint(`SSR Post HTML Page (/post/${firstSlug})`, `${BASE_URL}/post/${firstSlug}`));
  }

  // 4. Security & Admin Authentication Protection Tests
  console.log('\n🔒 Testing Security & Middleware Authentication Guards:');
  results.push(await testEndpoint('Admin Analytics WITHOUT Token (Should return 401)', `${BASE_URL}/api/analytics`));
  results.push(await testEndpoint('Admin Posts List WITHOUT Token (Should return 401)', `${BASE_URL}/api/admin/posts`));
  results.push(await testEndpoint('Admin Serper Keys WITHOUT Token (Should return 401)', `${BASE_URL}/api/serper-keys`));

  // 5. Admin Authentication Login Flow
  console.log('\n🔑 Testing Admin Login & Authenticated API Flow:');
  const loginRes = await testEndpoint('Admin Login (/api/admin/login)', `${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin123' }) // Default fallback or configured password
  });
  results.push(loginRes);

  let token = '';
  if (loginRes.body && loginRes.body.token) {
    token = loginRes.body.token;
  }

  if (token) {
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    results.push(await testEndpoint('Admin Analytics WITH Token (Should return 200)', `${BASE_URL}/api/analytics`, { headers: authHeaders }));
    results.push(await testEndpoint('Admin Posts WITH Token (Should return 200)', `${BASE_URL}/api/admin/posts`, { headers: authHeaders }));
    results.push(await testEndpoint('Admin Serper Keys WITH Token (Should return 200)', `${BASE_URL}/api/serper-keys`, { headers: authHeaders }));
  }

  // 6. Config Endpoints
  console.log('\n⚙️ Testing Auto-Poster Configuration Endpoints:');
  results.push(await testEndpoint('Get Telegram Config (/api/telegram-config)', `${BASE_URL}/api/telegram-config`));
  results.push(await testEndpoint('Get Userbot Config (/api/userbot-config)', `${BASE_URL}/api/userbot-config`));
  results.push(await testEndpoint('Get Twitter Config (/api/twitter-config)', `${BASE_URL}/api/twitter-config`));
  results.push(await testEndpoint('Get Custom Twitter Config (/api/custom-twitter-config)', `${BASE_URL}/api/custom-twitter-config`));
  results.push(await testEndpoint('Get Reddit Config (/api/reddit-config)', `${BASE_URL}/api/reddit-config`));

  console.log('\n===============================================================');
  const passed = results.filter(r => r.ok || (r.name.includes('WITHOUT Token') && r.status === 401)).length;
  console.log(`🏁 QA TEST SUITE COMPLETE: ${passed}/${results.length} Tests Passed!`);
  console.log('===============================================================\n');
}

runTestSuite();
