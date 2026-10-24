import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

console.log('🚀 [AdSense Compliance Master Update] Starting local file updates...');

// 1. Update server.js
const serverJsPath = path.join(ROOT_DIR, 'server.js');
let serverJs = fs.readFileSync(serverJsPath, 'utf8');

if (!serverJs.includes("'tools'")) {
  serverJs = serverJs.replace(
    "const POLICY_PAGES = ['about', 'privacy', 'terms', 'disclaimer', 'contact'];",
    "const POLICY_PAGES = ['about', 'privacy', 'terms', 'disclaimer', 'contact', 'tools'];"
  );
}

if (!serverJs.includes('/tools.html</loc>')) {
  serverJs = serverJs.replace(
    '  <url>\n    <loc>${baseUrl}/disclaimer.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n',
    '  <url>\n    <loc>${baseUrl}/disclaimer.html</loc>\n    <priority>0.5</priority>\n    <changefreq>monthly</changefreq>\n  </url>\n  <url>\n    <loc>${baseUrl}/tools.html</loc>\n    <priority>0.8</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n'
  );
}

fs.writeFileSync(serverJsPath, serverJs, 'utf8');
console.log('✅ 1. server.js updated with /tools route and sitemap entry.');

// 2. Update public/index.html & public/post.html navigation
function updateNav(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('href="/tools.html"')) {
    html = html.replace(
      '<li><a href="#" data-category="Science" class="category-btn">Science &amp; Space</a></li>',
      '<li><a href="#" data-category="Science" class="category-btn">Science &amp; Space</a></li>\n          <li><a href="/tools.html" class="category-btn" style="color: #2563EB; font-weight: 700;">Interactive Tools</a></li>'
    );
    html = html.replace(
      '<li><a href="/#category-science">Science &amp; Space</a></li>',
      '<li><a href="/#category-science">Science &amp; Space</a></li>\n          <li><a href="/tools.html" style="color: #2563EB; font-weight: 700;">Interactive Tools</a></li>'
    );
    html = html.replace(
      '<li><a href="/contact.html">Contact Newsroom</a></li>',
      '<li><a href="/tools.html">Interactive Tools</a></li>\n          <li><a href="/contact.html">Contact Newsroom</a></li>'
    );
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ 2. Updated navigation in ${path.basename(filePath)}`);
  }
}

updateNav(path.join(ROOT_DIR, 'public/index.html'));
updateNav(path.join(ROOT_DIR, 'public/post.html'));

// 3. Clean low-value, thin, sensitive posts from data/posts.json
const postsFilePath = path.join(ROOT_DIR, 'data/posts.json');
let posts = JSON.parse(fs.readFileSync(postsFilePath, 'utf8'));

const sensitivePattern = /\b(kill|killed|killing|dead|death|deaths|died|war|airstrike|strike|attacks|bomb|bombing|missile|flood|floods|earthquake|murder|jailed|prison|shooting|shooter|terror|terrorist|hostage|massacre|casualties|suicide|assault|crash|gunmen|headlines for|school assembly)\b/i;

let hiddenCount = 0;
posts.forEach(p => {
  const text = (p.contentHtml || '').replace(/<[^>]+>/g, ' ').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isSensitive = sensitivePattern.test(p.title || '');
  const isThin = wordCount < 600;

  if (isSensitive || isThin) {
    if (!p.hidden) {
      p.hidden = true;
      hiddenCount++;
    }
  }
});

fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2), 'utf8');
console.log(`✅ 3. Marked ${hiddenCount} thin/sensitive/war posts as hidden in posts.json!`);
console.log('🎉 Local updates complete! Ready to commit and deploy.');
