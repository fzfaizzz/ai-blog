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
  const cleanKeys = keysList.map(k => k.trim()).filter(k => k.length > 10);
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: cleanKeys, activeIndex: 0 }, null, 2));
  activeKeyIndex = 0;
  console.log(`✅ Saved ${cleanKeys.length} Gemini AI API Keys to pool.`);
  return cleanKeys;
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
