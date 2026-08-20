import { CustomFile } from 'telegram/client/uploads.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  const bannerPath = path.join(__dirname, '../data/test_banner.jpg');
  const buffer = fs.readFileSync(bannerPath);
  const customFile = new CustomFile('banner.jpg', buffer.length, '', buffer);
  console.log('CustomFile name:', customFile.name);
  console.log('CustomFile size:', customFile.size);
  console.log('CustomFile buffer length:', customFile.buffer ? customFile.buffer.length : 'no buffer');
}

testUpload();
