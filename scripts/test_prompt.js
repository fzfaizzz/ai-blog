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

const prompt = `You are a Senior Technology Editor. Write an informative 800-word overview on: "How to Run DeepSeek Locally on Laptops". Output clean HTML with <h2>, <p>, <ul>. Do not include markdown fences.`;

const postData = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7
  }
});

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.log('API Error:', JSON.stringify(json.error, null, 2));
      } else if (json.candidates && json.candidates[0]) {
        console.log('Candidate finishReason:', json.candidates[0].finishReason);
        console.log('Content exists:', !!json.candidates[0].content);
        if (json.candidates[0].content && json.candidates[0].content.parts) {
          console.log('First part text length:', json.candidates[0].content.parts[0].text ? json.candidates[0].content.parts[0].text.length : 0);
          console.log('Preview:', (json.candidates[0].content.parts[0].text || '').slice(0, 200));
        }
      } else {
        console.log('Raw response:', data.slice(0, 500));
      }
    } catch (e) {
      console.log('JSON Parse error:', e.message, 'Raw:', data.slice(0, 300));
    }
  });
});

req.on('error', e => console.error('Request error:', e));
req.write(postData);
req.end();
