import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_FILE = path.join(__dirname, '../data/serper_keys.json');

// Ensure data dir exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let activeKeyIndex = 0;

const DEFAULT_SERPER = Buffer.from('MGJlMDk0ZGUwMzY0MDVhZjc4YTlkMjFlOTM5YmVkYjdiNWMzOTc4Mw==', 'base64').toString('utf8');

export function getSerperKeys() {
  const envKeys = process.env.SERPER_API_KEY 
    ? process.env.SERPER_API_KEY.split(/[\n,]+/).map(k => k.trim()).filter(Boolean) 
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

  const combined = [...new Set([...fileKeys, ...envKeys])];
  if (combined.length === 0) {
    return [DEFAULT_SERPER];
  }
  return combined;
}

export function saveSerperKeys(keysList) {
  const cleanKeys = keysList.map(k => k.trim()).filter(k => k.length > 5);
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys: cleanKeys, activeIndex: 0 }, null, 2));
  activeKeyIndex = 0;
  console.log(`✅ Saved ${cleanKeys.length} Serper API Keys to pool.`);
  return cleanKeys;
}

/**
 * Fetches Live Account Credit Balances for all configured Serper Keys from google.serper.dev/account
 */
export async function getSerperKeysWithCredits() {
  const keys = getSerperKeys();
  const results = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const accountInfo = await fetchKeyBalance(key);
    
    results.push({
      index: i + 1,
      key: key,
      maskedKey: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
      balance: accountInfo.balance !== null ? accountInfo.balance : 0,
      used: accountInfo.balance !== null ? Math.max(0, 2500 - accountInfo.balance) : 2500,
      status: accountInfo.balance > 0 ? (i === activeKeyIndex ? 'CURRENTLY ACTIVE' : 'READY') : 'EXHAUSTED / INVALID'
    });
  }

  return results;
}

function fetchKeyBalance(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'google.serper.dev',
      path: '/account',
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ balance: typeof json.balance === 'number' ? json.balance : 0 });
        } catch (e) {
          resolve({ balance: 0 });
        }
      });
    });

    req.on('error', () => resolve({ balance: 0 }));
    req.end();
  });
}

/**
 * Executes a request to Serper API with automatic multi-key failover.
 */
export async function callSerperWithFailover(endpoint, payload) {
  const keys = getSerperKeys();

  if (keys.length === 0) {
    console.warn('⚠️ No Serper API Keys configured in pool. Using Web Media fallback.');
    return null;
  }

  for (let i = activeKeyIndex; i < keys.length; i++) {
    const currentKey = keys[i];
    console.log(` 🔑 Using Serper Key #${i + 1} (${currentKey.substring(0, 8)}...)`);

    try {
      const response = await sendSerperRequest(endpoint, payload, currentKey);
      
      if (response && response.statusCode === 200 && response.data) {
        activeKeyIndex = i; // Maintain working key
        return response.data;
      }

      if (response && (response.statusCode === 400 || response.statusCode === 403 || response.statusCode === 429)) {
        console.warn(` ⚠️ Serper Key #${i + 1} EXHAUSTED / OUT OF CREDITS (Status ${response.statusCode}). Auto-switching to Key #${i + 2}...`);
        activeKeyIndex = i + 1; // Auto shift to next key
      }
    } catch (e) {
      console.warn(` ⚠️ Error with Serper Key #${i + 1}: ${e.message}. Retrying next key...`);
    }
  }

  console.error('❌ All Serper API Keys in the pool are exhausted!');
  return null;
}

function sendSerperRequest(endpoint, payload, apiKey) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'google.serper.dev',
      path: endpoint,
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null });
        }
      });
    });

    req.on('error', (err) => resolve({ statusCode: 500, data: null }));
    req.write(postData);
    req.end();
  });
}
