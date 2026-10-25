import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

let key = process.env.GEMINI_API_KEY || '';
try {
  const p = path.join(ROOT_DIR, 'data/gemini_keys.json');
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(raw)) key = raw[0];
    else if (raw.keys && raw.keys[0]) key = raw.keys[0];
  }
} catch (e) {}

console.log('Using Key:', key ? key.substring(0, 10) + '...' : 'NONE');

const modelsToTest = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-pro-latest'
];

async function testModel(model) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: 'Hello, respond with ONE word: OK' }] }]
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${key}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${model}] HTTP ${res.statusCode}:`, data.trim().slice(0, 300));
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[${model}] Network error:`, err.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const m of modelsToTest) {
    await testModel(m);
  }
}

run();
