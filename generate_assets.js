import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// 1. High-Resolution Vector SVG Logo / Favicon
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#2563EB" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Base Rounded Container with Google-friendly 22% radius -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" stroke="#334155" stroke-width="8" />

  <!-- Background Subtle Accent Ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#1E293B" stroke-width="12" opacity="0.6" />

  <!-- Stylized "P" Stem in Electric Blue -->
  <path d="M 148 116 L 228 116 C 300 116 348 152 348 220 C 348 288 300 324 228 324 L 216 324 L 216 396 L 148 396 Z" fill="url(#primaryGrad)" filter="url(#glow)" />

  <!-- Inner P Counter Cutout -->
  <path d="M 216 180 L 228 180 C 264 180 286 196 286 220 C 286 244 264 260 228 260 L 216 260 Z" fill="#0F172A" />

  <!-- Dynamic Golden Lightning Energy Bolt Crossing Center -->
  <path d="M 292 116 L 220 256 L 284 256 L 236 396 L 356 240 L 292 240 Z" fill="url(#goldGrad)" />
</svg>`;

// 2. High-Res Social Sharing Card Banner (1200x630)
const svgOgCover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="60%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="blueG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#ogBg)" />

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="1200" height="8" fill="url(#blueG)" />

  <!-- Logo Mark Left -->
  <g transform="translate(100, 150) scale(0.65)">
    <rect width="512" height="512" rx="112" fill="#0F172A" stroke="#3B82F6" stroke-width="12" />
    <path d="M 148 116 L 228 116 C 300 116 348 152 348 220 C 348 288 300 324 228 324 L 216 324 L 216 396 L 148 396 Z" fill="url(#blueG)" />
    <path d="M 216 180 L 228 180 C 264 180 286 196 286 220 C 286 244 264 260 228 260 L 216 260 Z" fill="#0F172A" />
    <path d="M 292 116 L 220 256 L 284 256 L 236 396 L 356 240 L 292 240 Z" fill="url(#goldG)" />
  </g>

  <!-- Typography Right -->
  <text x="480" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="2">PRIME <tspan fill="#3B82F6">MEDIA</tspan></text>
  <text x="480" y="300" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="600" fill="#94A3B8">High-Tech, AI, Markets &amp; Global News Journalism</text>
  <text x="480" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="500" fill="#38BDF8">🌐 https://primemedia.site</text>

  <!-- Bottom Badges -->
  <g transform="translate(480, 430)">
    <rect width="180" height="42" rx="21" fill="#1E293B" stroke="#334155" />
    <text x="90" y="27" font-family="sans-serif" font-size="16" font-weight="700" fill="#F8FAFC" text-anchor="middle">⚡ BREAKING NEWS</text>

    <rect x="200" width="180" height="42" rx="21" fill="#1E293B" stroke="#334155" />
    <text x="290" y="27" font-family="sans-serif" font-size="16" font-weight="700" fill="#F8FAFC" text-anchor="middle">🤖 AI &amp; TECH WIRE</text>

    <rect x="400" width="180" height="42" rx="21" fill="#1E293B" stroke="#334155" />
    <text x="490" y="27" font-family="sans-serif" font-size="16" font-weight="700" fill="#F8FAFC" text-anchor="middle">📈 GLOBAL MARKETS</text>
  </g>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
fs.writeFileSync(path.join(publicDir, 'og-cover.svg'), svgOgCover);

// 3. Web App Manifest (Official PWA & Chrome Android Favicon Registry)
const manifest = {
  "name": "Prime Media",
  "short_name": "Prime Media",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#0F172A",
  "description": "High-Tech, Movies, Business & Global News Journalism",
  "icons": [
    {
      "src": "/favicon-48x48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "/favicon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/favicon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
};
fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('✅ Generated favicon.svg, og-cover.svg, and manifest.json!');

// 4. Render PNGs using sharp
async function convertPngs() {
  try {
    const sharp = (await import('sharp')).default;
    const svgBuffer = Buffer.from(svgFavicon);

    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'favicon.png'));
    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
    await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'favicon-192x192.png'));
    await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
    await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon-48x48.png'));
    await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
    await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
    await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));

    const ogBuffer = Buffer.from(svgOgCover);
    await sharp(ogBuffer).resize(1200, 630).png().toFile(path.join(publicDir, 'og-cover.png'));

    console.log('🎉 Successfully rendered all PNG Favicons, Apple Touch Icon, Logo.png, and OG-Cover.png!');
  } catch (err) {
    console.error('Sharp conversion error:', err.message);
  }
}

convertPngs();
