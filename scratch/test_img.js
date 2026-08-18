import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImageSave() {
  const sampleUrl = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';
  const res = await fetch(sampleUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const tempPath = path.join(__dirname, '../data/test_banner.jpg');
  fs.writeFileSync(tempPath, buffer);
  console.log(`Saved ${buffer.length} bytes to ${tempPath}`);
  console.log(`Exists: ${fs.existsSync(tempPath)}`);
}

testImageSave();
