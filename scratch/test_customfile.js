import { CustomFile } from 'telegram/client/uploads.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bannerPath = path.join(__dirname, '../data/test_banner.jpg');
if (fs.existsSync(bannerPath)) {
  const buffer = fs.readFileSync(bannerPath);
  const customFile = new CustomFile('banner.jpg', buffer.length, bannerPath, buffer);
  console.log('CustomFile created:', customFile.name, customFile.size);
} else {
  console.log('Banner not found');
}
