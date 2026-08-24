import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const sourceLogoPath = 'C:\\Users\\akhta\\.gemini\\antigravity\\brain\\b51013bb-55e4-4980-becd-3e3e573af56b\\prime_media_white_bg_logo_1787572976916.jpg';

async function processLogo() {
  try {
    const sharp = (await import('sharp')).default;

    if (!fs.existsSync(sourceLogoPath)) {
      console.error('Source logo file does not exist:', sourceLogoPath);
      return;
    }

    console.log('Processing new master logo into all web assets...');

    // 1. High-Res Logo.png (512x512)
    await sharp(sourceLogoPath).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
    await sharp(sourceLogoPath).resize(512, 512).png().toFile(path.join(publicDir, 'favicon.png'));

    // 2. Mobile & App Favicons
    await sharp(sourceLogoPath).resize(192, 192).png().toFile(path.join(publicDir, 'favicon-192x192.png'));
    await sharp(sourceLogoPath).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
    await sharp(sourceLogoPath).resize(48, 48).png().toFile(path.join(publicDir, 'favicon-48x48.png'));
    await sharp(sourceLogoPath).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
    await sharp(sourceLogoPath).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
    await sharp(sourceLogoPath).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));

    // 3. Crisp Social Media Share Card (og-cover.png 1200x630)
    // Compose with white/light elegant card with large centered logo
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: await sharp(sourceLogoPath).resize(580, 580, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer(),
        top: 25,
        left: 310
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-cover.png'));

    console.log('🎉 All logo formats (favicon.ico, favicon.png, logo.png, apple-touch-icon, og-cover) generated successfully!');
  } catch (err) {
    console.error('Error processing logo:', err);
  }
}

processLogo();
