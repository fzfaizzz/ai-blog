import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbGetSetting, dbSaveSetting } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/twitter_config.json');
const HISTORY_FILE = path.join(__dirname, '../data/twitter_history.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cachedTwitterConfig = null;
let lastTwitterPostTimestamp = 0;
const TWITTER_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown for automated tweets

/**
 * Synchronize Twitter API Configuration with MongoDB Atlas on Boot
 */
export async function syncTwitterConfigFromDB() {
  try {
    await connectDB();
    const doc = await dbGetSetting('twitter_config');
    if (doc && typeof doc === 'object') {
      cachedTwitterConfig = doc;
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(doc, null, 2));
      } catch (e) {}
      console.log('🐥 [Twitter Manager] Synchronized configuration from MongoDB Atlas.');
    }
  } catch (e) {
    console.warn('⚠️ [Twitter Manager] Could not sync config from MongoDB:', e.message);
  }
}
syncTwitterConfigFromDB();

/**
 * Gets Twitter/X Configuration
 */
export function getTwitterConfig() {
  if (cachedTwitterConfig) return cachedTwitterConfig;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      cachedTwitterConfig = data;
      return data;
    }
  } catch (e) {}

  return { apiKey: '', apiSecret: '', accessToken: '', accessSecret: '', autoPostEnabled: false };
}

/**
 * Checks if Twitter/X API is fully configured
 */
export function isTwitterConfigured() {
  const c = getTwitterConfig();
  return !!(c.apiKey && c.apiSecret && c.accessToken && c.accessSecret);
}

/**
 * Saves Twitter/X Configuration to Local & MongoDB Cloud
 */
export function saveTwitterConfig(config) {
  try {
    const current = getTwitterConfig();
    const updated = {
      ...current,
      ...config,
      apiKey: (config.apiKey !== undefined) ? String(config.apiKey).trim() : current.apiKey,
      apiSecret: (config.apiSecret !== undefined) ? String(config.apiSecret).trim() : current.apiSecret,
      accessToken: (config.accessToken !== undefined) ? String(config.accessToken).trim() : current.accessToken,
      accessSecret: (config.accessSecret !== undefined) ? String(config.accessSecret).trim() : current.accessSecret,
      autoPostEnabled: (config.autoPostEnabled !== undefined) ? !!config.autoPostEnabled : current.autoPostEnabled
    };

    cachedTwitterConfig = updated;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    dbSaveSetting('twitter_config', updated).catch(e => console.error('Error saving Twitter config to MongoDB:', e));

    console.log('✅ Saved Twitter/X API Configuration to Local & MongoDB Atlas');
    return true;
  } catch (e) {
    console.error('Error saving Twitter config:', e);
    return false;
  }
}

/**
 * Twitter Posted Articles History Tracker
 */
export function getTwitterHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return { postedSlugs: [], lastPostedAt: null, totalCount: 0 };
}

function saveTwitterHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    dbSaveSetting('twitter_history', history).catch(() => {});
  } catch (e) {}
}

/**
 * Builds a strict 280-character compliant high-CTR Tweet text with dynamic viral hashtags
 */
export function buildTweetText(post, postUrl) {
  const keywordTags = [];
  const lowerTitle = ((post.title || '') + ' ' + (post.metaDescription || '') + ' ' + (post.category || '')).toLowerCase();

  if (lowerTitle.includes('movie') || lowerTitle.includes('film') || lowerTitle.includes('cinema') || lowerTitle.includes('trailer') || lowerTitle.includes('box office') || lowerTitle.includes('netflix')) {
    keywordTags.push('#Movies', '#Cinema', '#Hollywood');
  } else if (lowerTitle.includes('ai') || lowerTitle.includes('gpt') || lowerTitle.includes('claude') || lowerTitle.includes('deepseek') || lowerTitle.includes('openai')) {
    keywordTags.push('#AINews', '#ArtificialIntelligence', '#Tech');
  } else if (lowerTitle.includes('spacex') || lowerTitle.includes('musk') || lowerTitle.includes('nasa') || lowerTitle.includes('space') || lowerTitle.includes('rocket')) {
    keywordTags.push('#SpaceX', '#ElonMusk', '#NASA');
  } else if (lowerTitle.includes('stock') || lowerTitle.includes('market') || lowerTitle.includes('economy') || lowerTitle.includes('wall street')) {
    keywordTags.push('#StockMarket', '#Markets', '#Economy');
  } else if (lowerTitle.includes('crypto') || lowerTitle.includes('btc') || lowerTitle.includes('bitcoin')) {
    keywordTags.push('#Crypto', '#Bitcoin', '#Web3');
  } else if (lowerTitle.includes('tech') || lowerTitle.includes('apple') || lowerTitle.includes('google') || lowerTitle.includes('nvidia') || lowerTitle.includes('chip')) {
    keywordTags.push('#TechNews', '#Innovation', '#Tech');
  } else {
    keywordTags.push('#BreakingNews', '#Trending', '#WorldNews');
  }

  keywordTags.push('#PrimeMedia');
  const hashtags = [...new Set(keywordTags)].slice(0, 3).join(' ');

  // Twitter counts any URL as 23 characters (t.co)
  // Total limit: 280 chars. Let's target max 265 for safety margin.
  const prefix = '🚨 BREAKING: ';
  const readMore = '\n\n📖 Read full story 👇\n' + postUrl + '\n\n' + hashtags;
  
  // Calculate available length for headline + snippet
  // Note: in string representation, postUrl will be replaced by 23 char t.co by Twitter
  const urlDisplayLen = 23;
  const fixedOverhead = prefix.length + '\n\n📖 Read full story 👇\n'.length + urlDisplayLen + '\n\n'.length + hashtags.length;
  const availableForHeadlineAndSnippet = Math.max(60, 270 - fixedOverhead);

  let title = (post.title || '').trim();
  let snippet = (post.metaDescription || '').trim();

  let body = '';
  if (title.length > availableForHeadlineAndSnippet) {
    body = title.substring(0, availableForHeadlineAndSnippet - 3) + '...';
  } else {
    const remainingForSnippet = availableForHeadlineAndSnippet - title.length - 4;
    if (remainingForSnippet > 35 && snippet) {
      const cleanSnippet = snippet.substring(0, remainingForSnippet - 3).trim() + '...';
      body = `${title}\n\n${cleanSnippet}`;
    } else {
      body = title;
    }
  }

  return `${prefix}${body}${readMore}`;
}

/**
 * Generates OAuth 1.0a Header for Twitter API v2
 */
function generateOAuthHeader(method, url, params, consumerSecret, tokenSecret) {
  const oauthParams = {
    oauth_consumer_key: params.oauth_consumer_key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: params.oauth_token,
    oauth_version: '1.0'
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return authHeader;
}

/**
 * Sends a published article automatically to Twitter / X via Official API v2
 * @param {object} post - The article to post
 * @param {boolean} [isManual=false] - Bypass anti-spam cooldown for manual test/button clicks
 */
export async function sendPostToTwitter(post, isManual = false) {
  const config = getTwitterConfig();
  if (!config.apiKey || !config.apiSecret || !config.accessToken || !config.accessSecret) {
    return { success: false, message: 'Twitter API not configured (missing API Key, Secret, Access Token, or Secret).' };
  }

  if (!isManual && !config.autoPostEnabled) {
    return { success: false, message: 'Twitter API auto-posting is disabled in settings.' };
  }

  // Anti-Spam Cooldown Protection
  const now = Date.now();
  if (!isManual && (now - lastTwitterPostTimestamp) < TWITTER_COOLDOWN_MS) {
    const waitMins = Math.ceil((TWITTER_COOLDOWN_MS - (now - lastTwitterPostTimestamp)) / 60000);
    console.log(`⏳ [Twitter Bot Cooldown]: Last tweet was recent. Waiting ${waitMins}m to respect Twitter rate limits.`);
    return { success: false, message: `Cooldown active. Waiting ${waitMins}m before next tweet.` };
  }

  // Check Duplicate History
  const history = getTwitterHistory();
  if (!isManual && history.postedSlugs && history.postedSlugs.includes(post.slug)) {
    return { success: false, message: `Article "${post.slug}" has already been tweeted to Twitter/X.` };
  }

  const domain = (process.env.BASE_URL || 'https://primemedia.site').replace(/\/+$/, '');
  const postUrl = `${domain}/post/${post.slug}`;
  const tweetText = buildTweetText(post, postUrl);

  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';

    const params = {
      oauth_consumer_key: config.apiKey,
      oauth_token: config.accessToken
    };

    const authHeader = generateOAuthHeader(method, url, params, config.apiSecret, config.accessSecret);

    console.log(`🐥 [Twitter API] Sending tweet for "${post.title.substring(0, 50)}..."`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: tweetText })
    });

    const resData = await response.json();
    if (response.ok && resData.data && resData.data.id) {
      console.log(`🐥 Successfully tweeted to Twitter/X: ${post.title} (Tweet ID: ${resData.data.id})`);
      
      lastTwitterPostTimestamp = Date.now();
      if (!history.postedSlugs) history.postedSlugs = [];
      if (!history.postedSlugs.includes(post.slug)) {
        history.postedSlugs.push(post.slug);
      }
      history.lastPostedAt = new Date().toISOString();
      history.totalCount = (history.totalCount || 0) + 1;
      saveTwitterHistory(history);

      return { success: true, message: `Tweet posted successfully! (ID: ${resData.data.id})`, tweetId: resData.data.id };
    } else {
      console.error('Twitter API error response:', resData);
      const errMsg = resData.detail || resData.title || resData.errors?.[0]?.message || JSON.stringify(resData);
      return { success: false, message: `Twitter API Error: ${errMsg}` };
    }
  } catch (e) {
    console.error('Error sending post to Twitter API:', e);
    return { success: false, message: e.message };
  }
}
