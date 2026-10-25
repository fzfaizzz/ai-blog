import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const INDEXNOW_KEY = '77177bd8efd14f0e9f108cc0749674ce';
const DOMAIN = 'primemedia.site';
const KEY_LOCATION = `https://${DOMAIN}/${INDEXNOW_KEY}.txt`;

async function main() {
  console.log('🚀 [Mega IndexNow & Search Engine Pinger] Starting execution...');

  const postsFile = path.join(ROOT_DIR, 'data/posts.json');
  let posts = [];
  try {
    posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  } catch (e) {
    console.error('Error reading posts:', e.message);
  }

  // Filter out hidden or thin posts
  const validPosts = posts.filter(p => !p.hidden && p.slug && !/\b(kill|killed|killing|dead|death|deaths|died|airstrike|bombing|massacre|casualties|suicide|murder|jailed)\b/i.test(p.title || ''));

  console.log(`Found ${validPosts.length} valid active posts.`);

  // Prioritize flagship guides + top fresh 100 posts
  const flagshipSlugs = [
    'how-to-run-deepseek-qwen-llama-locally-8gb-16gb-laptop-guide',
    'top-10-free-ai-video-generators-2026-no-watermark-commercial-rights',
    'tech-stock-dollar-cost-averaging-compound-returns-risk-mitigation-playbook-2026'
  ];

  const urlList = [
    `https://${DOMAIN}/`,
    `https://${DOMAIN}/tools.html`,
    `https://${DOMAIN}/about.html`,
    `https://${DOMAIN}/privacy.html`,
    `https://${DOMAIN}/terms.html`,
    `https://${DOMAIN}/contact.html`
  ];

  flagshipSlugs.forEach(slug => {
    urlList.push(`https://${DOMAIN}/post/${slug}`);
  });

  validPosts.slice(0, 100).forEach(p => {
    const u = `https://${DOMAIN}/post/${p.slug}`;
    if (!urlList.includes(u)) {
      urlList.push(u);
    }
  });

  console.log(`📡 Submitting ${urlList.length} prioritized URLs to IndexNow protocol (Bing, Yahoo, DuckDuckGo, Yandex, Seznam)...`);

  const payload = {
    host: DOMAIN,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    console.log(`✅ IndexNow Response Status: ${res.status} (${res.statusText})`);
    if (res.status === 200 || res.status === 202) {
      console.log('🎉 Successfully submitted URLs to IndexNow Search Engine network!');
    } else {
      const errText = await res.text();
      console.warn('IndexNow warning details:', errText);
    }
  } catch (err) {
    console.error('IndexNow network error:', err.message);
  }

  // Ping Google Sitemap
  try {
    console.log('🌐 Pinging Google Sitemap...');
    const gRes = await fetch(`https://www.google.com/ping?sitemap=https://${DOMAIN}/sitemap.xml`);
    console.log(`   Google Sitemap Ping Status: ${gRes.status}`);
  } catch (e) {
    console.warn('   Google ping note:', e.message);
  }

  // Ping Bing Sitemap
  try {
    console.log('🌐 Pinging Bing Sitemap...');
    const bRes = await fetch(`https://www.bing.com/ping?sitemap=https://${DOMAIN}/sitemap.xml`);
    console.log(`   Bing Sitemap Ping Status: ${bRes.status}`);
  } catch (e) {
    console.warn('   Bing ping note:', e.message);
  }

  console.log('\n🏁 [Mega Indexer Complete] Finished all search engine submission alerts.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
