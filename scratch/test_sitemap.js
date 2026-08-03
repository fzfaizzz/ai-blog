import fs from 'fs';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const data = fs.readFileSync('data/posts.json', 'utf8');
const posts = JSON.parse(data);
const baseUrl = 'https://thedailychronicle.up.railway.app';

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
xml += '  <url>\n    <loc>' + baseUrl + '/index.html</loc>\n    <priority>1.0</priority>\n    <changefreq>daily</changefreq>\n  </url>\n';

posts.forEach(post => {
  xml += '  <url>\n';
  xml += '    <loc>' + baseUrl + '/post/' + escapeXml(post.slug) + '</loc>\n';
  xml += '    <lastmod>' + new Date(post.publishedAt).toISOString().split('T')[0] + '</lastmod>\n';
  xml += '    <priority>0.8</priority>\n';
  xml += '    <changefreq>weekly</changefreq>\n';
  if (post.imageUrl) {
    xml += '    <image:image><image:loc>' + escapeXml(post.imageUrl) + '</image:loc><image:title>' + escapeXml(post.title) + '</image:title></image:image>\n';
  }
  xml += '    <news:news><news:publication><news:name>The Daily Chronicle</news:name><news:language>en</news:language></news:publication><news:publication_date>' + new Date(post.publishedAt).toISOString() + '</news:publication_date><news:title>' + escapeXml(post.title) + '</news:title></news:news>\n';
  xml += '  </url>\n';
});

xml += '</urlset>';

const lines = xml.split('\n');
console.log('TOTAL LINES:', lines.length);
for (let i = 50; i <= 60; i++) {
  console.log(`LINE ${i}:`, lines[i - 1]);
}
