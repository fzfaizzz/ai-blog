import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbGetSetting, dbSaveSetting } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/reddit_config.json');
const HISTORY_FILE = path.join(__dirname, '../data/reddit_history.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cachedRedditConfig = null;
let lastRedditPostTimestamp = 0;
const REDDIT_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes anti-spam cooldown for automated runs

/**
 * Synchronize Reddit Configuration with MongoDB Atlas on Boot
 */
export async function syncRedditConfigFromDB() {
  try {
    await connectDB();
    const doc = await dbGetSetting('reddit_config');
    if (doc && typeof doc === 'object') {
      cachedRedditConfig = doc;
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(doc, null, 2));
      } catch (e) {}
      console.log('🔴 [Reddit Manager] Synchronized configuration from MongoDB Atlas.');
    }
  } catch (e) {
    console.warn('⚠️ [Reddit Manager] Could not sync config from MongoDB:', e.message);
  }
}
syncRedditConfigFromDB();

/**
 * Gets Reddit Auto-Poster Configuration
 */
export function getRedditConfig() {
  if (cachedRedditConfig) return cachedRedditConfig;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      cachedRedditConfig = data;
      return data;
    }
  } catch (e) {}

  return {
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    subreddit: '',
    autoPostEnabled: false
  };
}

/**
 * Checks if Reddit Auto-Poster is fully configured
 */
export function isRedditConfigured() {
  const c = getRedditConfig();
  return !!(c.clientId && c.clientSecret && c.username && c.password);
}

/**
 * Saves Reddit Auto-Poster Configuration to Local & MongoDB Cloud
 */
export function saveRedditConfig(config) {
  try {
    const current = getRedditConfig();
    const updated = {
      ...current,
      ...config,
      clientId: (config.clientId !== undefined) ? String(config.clientId).trim() : current.clientId,
      clientSecret: (config.clientSecret !== undefined) ? String(config.clientSecret).trim() : current.clientSecret,
      username: (config.username !== undefined) ? String(config.username).trim() : current.username,
      password: (config.password !== undefined) ? String(config.password).trim() : current.password,
      subreddit: (config.subreddit !== undefined) ? String(config.subreddit).trim() : current.subreddit,
      autoPostEnabled: (config.autoPostEnabled !== undefined) ? !!config.autoPostEnabled : current.autoPostEnabled
    };

    cachedRedditConfig = updated;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    dbSaveSetting('reddit_config', updated).catch(e => console.error('Error saving Reddit config to MongoDB:', e));

    console.log('✅ Saved Reddit Auto-Poster Configuration to Local & MongoDB Atlas');
    return true;
  } catch (e) {
    console.error('Error saving Reddit config:', e);
    return false;
  }
}

/**
 * Reddit Posted Articles History Tracker
 */
export function getRedditHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return { postedSlugs: [], lastPostedAt: null, totalCount: 0 };
}

function saveRedditHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    dbSaveSetting('reddit_history', history).catch(() => {});
  } catch (e) {}
}

/**
 * Obtains an OAuth Access Token from Reddit API
 */
async function getRedditAccessToken(config) {
  const authHeader = 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  const params = new URLSearchParams({
    grant_type: 'password',
    username: config.username,
    password: config.password
  });

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PrimeMediaBot/1.0.0 (by /u/' + (config.username || 'PrimeMediaNews') + ')'
    },
    body: params.toString()
  });

  const data = await res.json();
  if (data.access_token) {
    return data.access_token;
  }
  throw new Error(data.error || data.message || 'Failed to authenticate with Reddit API. Check Client ID, Secret, and Password.');
}

/**
 * Automatically posts an article to Reddit Subreddit or User Profile
 * @param {object} post - The article to post
 * @param {boolean} [isManual=false] - Bypass anti-spam cooldown for manual test/button clicks
 */
export async function sendPostToReddit(post, isManual = false) {
  const config = getRedditConfig();

  if (!config.clientId || !config.clientSecret || !config.username || !config.password) {
    return { success: false, message: 'Reddit Auto-Poster not configured (missing Client ID, Secret, Username, or Password).' };
  }

  if (!isManual && !config.autoPostEnabled) {
    return { success: false, message: 'Reddit Auto-Poster is disabled in settings.' };
  }

  // Anti-Spam Cooldown Protection: prevent Reddit API bans
  const now = Date.now();
  if (!isManual && (now - lastRedditPostTimestamp) < REDDIT_COOLDOWN_MS) {
    const waitMins = Math.ceil((REDDIT_COOLDOWN_MS - (now - lastRedditPostTimestamp)) / 60000);
    console.log(`⏳ [Reddit Bot Cooldown]: Last post was recent. Waiting ${waitMins}m to respect Reddit spam filters.`);
    return { success: false, message: `Cooldown active. Waiting ${waitMins}m before next Reddit post.` };
  }

  // Check Duplicate History
  const history = getRedditHistory();
  if (!isManual && history.postedSlugs && history.postedSlugs.includes(post.slug)) {
    return { success: false, message: `Article "${post.slug}" has already been submitted to Reddit.` };
  }

  const domain = (process.env.BASE_URL || 'https://primemedia.site').replace(/\/+$/, '');
  const postUrl = `${domain}/post/${post.slug}`;

  // Smart Subreddit Target: Default to personal profile u_username for 100% posting success without automod rejection
  let subredditsToTarget = ['u_' + config.username];
  if (config.subreddit && config.subreddit.trim()) {
    subredditsToTarget = config.subreddit
      .split(/[\n,]+/)
      .map(s => s.replace(/^r\//i, '').trim())
      .filter(Boolean);
  }

  // Reddit title length limit is 300 characters
  let cleanTitle = (post.title || '').trim();
  if (cleanTitle.length > 290) {
    cleanTitle = cleanTitle.substring(0, 287) + '...';
  }

  try {
    console.log(`🤖 [Reddit Bot] Authenticating with Reddit API for /u/${config.username}...`);
    const accessToken = await getRedditAccessToken(config);

    const results = [];
    for (const targetSr of subredditsToTarget) {
      const submitParams = new URLSearchParams({
        sr: targetSr,
        kind: 'link',
        title: cleanTitle,
        url: postUrl,
        resubmit: 'true',
        api_type: 'json'
      });

      console.log(`🤖 [Reddit Bot] Submitting link to r/${targetSr}: "${cleanTitle}"...`);
      const response = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PrimeMediaBot/1.0.0 (by /u/' + config.username + ')'
        },
        body: submitParams.toString()
      });

      const result = await response.json();
      const postDetails = result?.json?.data;
      const errors = result?.json?.errors;

      if (postDetails && postDetails.url) {
        console.log(`🔴 [Reddit Bot] SUCCESS! Post submitted to r/${targetSr}: ${postDetails.url}`);
        results.push({ sr: targetSr, success: true, url: postDetails.url });
      } else if (errors && errors.length > 0) {
        const errString = errors.map(e => e.join(': ')).join(' | ');
        console.warn(`⚠️ [Reddit Bot] Warning on r/${targetSr}: ${errString}`);
        results.push({ sr: targetSr, success: false, error: errString });
      } else {
        results.push({ sr: targetSr, success: true, url: `https://reddit.com/r/${targetSr}` });
      }
    }

    const anySuccess = results.some(r => r.success);
    if (anySuccess) {
      lastRedditPostTimestamp = Date.now();
      if (!history.postedSlugs) history.postedSlugs = [];
      if (!history.postedSlugs.includes(post.slug)) {
        history.postedSlugs.push(post.slug);
      }
      history.lastPostedAt = new Date().toISOString();
      history.totalCount = (history.totalCount || 0) + 1;
      saveRedditHistory(history);

      const successUrls = results.filter(r => r.success).map(r => r.url).join(' | ');
      return { success: true, message: `Successfully posted to Reddit! (${successUrls})`, results };
    }

    const firstError = results.find(r => !r.success)?.error || 'Reddit submission failed';
    return { success: false, message: `Reddit API Error: ${firstError}`, results };
  } catch (e) {
    console.error('❌ Error in Reddit Bot:', e.message);
    return { success: false, message: e.message };
  }
}
