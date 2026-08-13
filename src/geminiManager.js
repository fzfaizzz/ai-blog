import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_FILE = path.join(__dirname, '../data/gemini_keys.json');

// Ensure data dir exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let activeKeyIndex = 0;

export function getGeminiKeys() {
  const envKeys = process.env.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY.split(/[\n,]+/).map(k => k.trim()).filter(Boolean) 
    : [];

  let fileKeys = [];
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf8');
      const json = JSON.parse(data);
      if (Array.isArray(json.keys)) {
        fileKeys = json.keys.map(k => k.trim()).filter(Boolean);
      }
    }
  } catch (e) {}

  return [...new Set([...fileKeys, ...envKeys])];
}

export function saveGeminiKeys(keysList) {
  const currentKeys = getGeminiKeys();
  const cleanKeys = keysList.map(k => k.trim()).filter(k => k.length > 10);

  const resolvedKeys = cleanKeys.map(key => {
    if (key.includes('...')) {
      const parts = key.split('...');
      const prefix = parts[0] || '';
      const suffix = parts[1] || '';
      const found = currentKeys.find(r => (prefix ? r.startsWith(prefix) : true) && (suffix ? r.endsWith(suffix) : true));
      if (found) return found;
    }
    return key;
  });

  const uniqueKeys = [...new Set(resolvedKeys)];
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: uniqueKeys, activeIndex: 0 }, null, 2));
  activeKeyIndex = 0;
  console.log(`✅ Saved ${uniqueKeys.length} Gemini AI API Keys to pool.`);
  return uniqueKeys;
}

export function getActiveGeminiKey() {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;
  if (activeKeyIndex >= keys.length) activeKeyIndex = 0;
  return keys[activeKeyIndex];
}

export function rotateGeminiKey() {
  const keys = getGeminiKeys();
  if (keys.length <= 1) return null;
  activeKeyIndex = (activeKeyIndex + 1) % keys.length;
  console.log(`🔄 Rotated to Gemini API Key #${activeKeyIndex + 1}`);
  return keys[activeKeyIndex];
}
