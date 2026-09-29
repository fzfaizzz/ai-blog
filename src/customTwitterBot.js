import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, dbGetSetting, dbSaveSetting } from './db.js';
import { buildTweetText } from './twitterManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/custom_twitter_config.json');
const HISTORY_FILE = path.join(__dirname, '../data/custom_twitter_history.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Official Twitter Web Public Bearer Token (used by x.com web client)
const TWITTER_WEB_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

let cachedCustomTwitterConfig = null;
let lastCustomTwitterPostTimestamp = 0;
const CUSTOM_TWITTER_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown

/**
 * Synchronize Custom Twitter Cookie Bot Configuration with MongoDB Atlas on Boot
 */
export async function syncCustomTwitterConfigFromDB() {
  try {
    await connectDB();
    const doc = await dbGetSetting('custom_twitter_config');
    if (doc && typeof doc === 'object') {
      cachedCustomTwitterConfig = doc;
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(doc, null, 2));
      } catch (e) {}
      console.log('🤖 [Custom Twitter Bot] Synchronized configuration from MongoDB Atlas.');
    }
  } catch (e) {
    console.warn('⚠️ [Custom Twitter Bot] Could not sync config from MongoDB:', e.message);
  }
}
syncCustomTwitterConfigFromDB();

/**
 * Gets Custom Cookie Twitter Bot Configuration
 */
export function getCustomTwitterConfig() {
  if (cachedCustomTwitterConfig) return cachedCustomTwitterConfig;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      cachedCustomTwitterConfig = data;
      return data;
    }
  } catch (e) {}

  return { authToken: '', csrfToken: '', autoPostEnabled: false };
}

/**
 * Checks if Custom Twitter Bot is configured
 */
export function isCustomTwitterConfigured() {
  const c = getCustomTwitterConfig();
  return !!(c.authToken && c.csrfToken);
}

/**
 * Saves Custom Cookie Twitter Bot Configuration to Local & MongoDB Cloud
 */
export function saveCustomTwitterConfig(config) {
  try {
    const current = getCustomTwitterConfig();
    const updated = {
      ...current,
      ...config,
      authToken: (config.authToken !== undefined) ? String(config.authToken).trim() : current.authToken,
      csrfToken: (config.csrfToken !== undefined) ? String(config.csrfToken).trim() : current.csrfToken,
      autoPostEnabled: (config.autoPostEnabled !== undefined) ? !!config.autoPostEnabled : current.autoPostEnabled
    };

    cachedCustomTwitterConfig = updated;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    dbSaveSetting('custom_twitter_config', updated).catch(e => console.error('Error saving Custom Twitter config to MongoDB:', e));

    console.log('✅ Saved Custom Cookie Twitter Bot Configuration to Local & MongoDB Atlas');
    return true;
  } catch (e) {
    console.error('Error saving Custom Twitter config:', e);
    return false;
  }
}

/**
 * Custom Twitter Posted History Tracker
 */
export function getCustomTwitterHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return { postedSlugs: [], lastPostedAt: null, totalCount: 0 };
}

function saveCustomTwitterHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    dbSaveSetting('custom_twitter_history', history).catch(() => {});
  } catch (e) {}
}

/**
 * Sends a tweet automatically via Twitter Web Cookie Session (0 API Fees)
 * @param {object} post - The article to tweet
 * @param {boolean} [isManual=false] - Bypass anti-spam cooldown for manual test/button clicks
 */
export async function sendTweetViaCookieSession(post, isManual = false) {
  const config = getCustomTwitterConfig();
  if (!config.authToken || !config.csrfToken) {
    return { success: false, message: 'Custom Twitter Bot not configured (missing auth_token or ct0 cookie).' };
  }

  if (!isManual && !config.autoPostEnabled) {
    return { success: false, message: 'Custom Twitter Bot is disabled in settings.' };
  }

  // Anti-Spam Cooldown Protection
  const now = Date.now();
  if (!isManual && (now - lastCustomTwitterPostTimestamp) < CUSTOM_TWITTER_COOLDOWN_MS) {
    const waitMins = Math.ceil((CUSTOM_TWITTER_COOLDOWN_MS - (now - lastCustomTwitterPostTimestamp)) / 60000);
    console.log(`⏳ [Custom Twitter Bot Cooldown]: Waiting ${waitMins}m before next tweet.`);
    return { success: false, message: `Cooldown active. Waiting ${waitMins}m before next tweet.` };
  }

  // Check Duplicate History
  const history = getCustomTwitterHistory();
  if (!isManual && history.postedSlugs && history.postedSlugs.includes(post.slug)) {
    return { success: false, message: `Article "${post.slug}" has already been tweeted via Custom Bot.` };
  }

  const domain = (process.env.BASE_URL || 'https://primemedia.site').replace(/\/+$/, '');
  const postUrl = `${domain}/post/${post.slug}`;
  const tweetText = buildTweetText(post, postUrl);

  try {
    // 1. Primary: Twitter Web Internal v1.1 Status Update Endpoint
    const v1Endpoint = 'https://x.com/i/api/1.1/statuses/update.json';
    const bodyParams = new URLSearchParams();
    bodyParams.append('status', tweetText);

    console.log(`🤖 [Custom Twitter Bot] Sending tweet via session cookie...`);
    let response = await fetch(v1Endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TWITTER_WEB_BEARER_TOKEN}`,
        'x-csrf-token': config.csrfToken,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'Cookie': `auth_token=${config.authToken}; ct0=${config.csrfToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: bodyParams.toString()
    });

    let rawText = await response.text();
    let resData = {};
    try { resData = JSON.parse(rawText); } catch(e) {}

    if (response.ok && (resData.id_str || resData.id)) {
      console.log(`🐥 Custom Cookie Bot successfully tweeted to X: ${post.title}`);
      lastCustomTwitterPostTimestamp = Date.now();
      if (!history.postedSlugs) history.postedSlugs = [];
      if (!history.postedSlugs.includes(post.slug)) history.postedSlugs.push(post.slug);
      history.lastPostedAt = new Date().toISOString();
      history.totalCount = (history.totalCount || 0) + 1;
      saveCustomTwitterHistory(history);

      return { success: true, message: `Tweet posted successfully! (ID: ${resData.id_str || resData.id})` };
    }

    // 2. Secondary: API.Twitter.com v1.1 Status Update Endpoint
    const v1ApiEndpoint = 'https://api.twitter.com/1.1/statuses/update.json';
    response = await fetch(v1ApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TWITTER_WEB_BEARER_TOKEN}`,
        'x-csrf-token': config.csrfToken,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'Cookie': `auth_token=${config.authToken}; ct0=${config.csrfToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: bodyParams.toString()
    });

    rawText = await response.text();
    try { resData = JSON.parse(rawText); } catch(e) {}

    if (response.ok && (resData.id_str || resData.id)) {
      console.log(`🐥 Custom Cookie Bot successfully tweeted to X: ${post.title}`);
      lastCustomTwitterPostTimestamp = Date.now();
      if (!history.postedSlugs) history.postedSlugs = [];
      if (!history.postedSlugs.includes(post.slug)) history.postedSlugs.push(post.slug);
      history.lastPostedAt = new Date().toISOString();
      history.totalCount = (history.totalCount || 0) + 1;
      saveCustomTwitterHistory(history);

      return { success: true, message: `Tweet posted successfully! (ID: ${resData.id_str || resData.id})` };
    }

    // 3. Fallback: GraphQL CreateTweet Endpoint
    const endpoint = 'https://x.com/i/api/graphql/5V8HGKFYZSimWqTxsnFRbg/CreateTweet';
    const payload = {
      variables: {
        tweet_text: tweetText,
        dark_request: false,
        media: { media_entities: [], possibly_sensitive: false },
        semantic_annotation_ids: []
      },
      features: {
        tweet_with_visibility_results_prefer_grok_responses: false,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true
      },
      fieldToggles: {
        withArticleRichText: false
      }
    };

    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TWITTER_WEB_BEARER_TOKEN}`,
        'x-csrf-token': config.csrfToken,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'Cookie': `auth_token=${config.authToken}; ct0=${config.csrfToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    rawText = await response.text();
    try { resData = JSON.parse(rawText); } catch(e) {}

    if (response.ok && (resData.data?.create_tweet || resData.data?.tweet_result)) {
      console.log(`🐥 Custom Cookie Bot successfully tweeted to X: ${post.title}`);
      lastCustomTwitterPostTimestamp = Date.now();
      if (!history.postedSlugs) history.postedSlugs = [];
      if (!history.postedSlugs.includes(post.slug)) history.postedSlugs.push(post.slug);
      history.lastPostedAt = new Date().toISOString();
      history.totalCount = (history.totalCount || 0) + 1;
      saveCustomTwitterHistory(history);

      return { success: true, message: 'Tweet posted successfully via Custom Server Bot!' };
    } else {
      console.error('Custom Twitter Bot error:', rawText);
      const errMsg = resData.errors?.[0]?.message || resData.message || (rawText ? rawText.substring(0, 120) : 'Invalid session cookies');
      return { success: false, message: `Response Error: ${errMsg}. Check auth_token and ct0 cookies.` };
    }
  } catch (e) {
    console.error('Error in Custom Twitter Bot:', e);
    return { success: false, message: e.message };
  }
}
