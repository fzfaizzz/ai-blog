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
  const defaultKeys = [
    'AIzaSyAX0wAvZylLWx9jpgfSRc6PNzKvLYz36X8',
    'AIzaSyCP5FIWClv6hdrJI_j6qtG8xIgwcKF5S7c',
    'AIzaSyDTAFUzbkxpqZ0ZyOw4ErGJE9CkF8iPkt0'
  ];

  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf8');
      const json = JSON.parse(data);
      if (Array.isArray(json.keys) && json.keys.length > 0) {
        return json.keys;
      }
    }
  } catch (e) {}
  
  if (process.env.GEMINI_API_KEY) {
    return [process.env.GEMINI_API_KEY];
  }

  saveGeminiKeys(defaultKeys);
  return defaultKeys;
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
