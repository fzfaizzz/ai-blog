// Official Google Indexing API Integration (Real-time Googlebot Crawl Alert)
// Endpoint: https://indexing.googleapis.com/v3/urlNotifications:publish
// Requires Google Cloud Service Account with indexing scope

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dbGetSetting } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../data/service_account.json');
const ROOT_SERVICE_ACCOUNT = path.join(__dirname, '../service_account.json');

let cachedToken = null;
let tokenExpiresAt = 0;
let cachedSa = null;

export async function getServiceAccount() {
  if (cachedSa) return cachedSa;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      cachedSa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return cachedSa;
    } catch (e) {}
  }
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    try {
      cachedSa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
      return cachedSa;
    } catch (e) {}
  }
  if (fs.existsSync(ROOT_SERVICE_ACCOUNT)) {
    try {
      cachedSa = JSON.parse(fs.readFileSync(ROOT_SERVICE_ACCOUNT, 'utf8'));
      return cachedSa;
    } catch (e) {}
  }
  try {
    const doc = await dbGetSetting('google_service_account');
    if (doc) {
      cachedSa = doc;
      return cachedSa;
    }
  } catch (e) {}
  return null;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 60) {
    return cachedToken;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${claim}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (tokenData.access_token) {
    cachedToken = tokenData.access_token;
    tokenExpiresAt = now + (tokenData.expires_in || 3600);
    return cachedToken;
  }
  throw new Error(tokenData.error_description || tokenData.error || 'Failed to get access token');
}

/**
 * Submit URL to Google Official Indexing API
 * @param {string} url - Full URL to index
 * @param {'URL_UPDATED'|'URL_DELETED'} type
 * @returns {Promise<boolean>}
 */
export async function submitToGoogleIndexing(url, type = 'URL_UPDATED') {
  const sa = await getServiceAccount();
  if (!sa || !sa.client_email || !sa.private_key) {
    return false;
  }

  try {
    const accessToken = await getAccessToken(sa);
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: url,
        type: type
      })
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`🚀 [Google Indexing API] Successfully notified Googlebot for: ${url} (Type: ${type})`);
      return true;
    } else {
      console.warn(`⚠️ [Google Indexing API] Request failed (${res.status}):`, data.error?.message || data);
      return false;
    }
  } catch (err) {
    console.error('❌ [Google Indexing API] Error:', err.message);
    return false;
  }
}