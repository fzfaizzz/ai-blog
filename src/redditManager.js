import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/reddit_config.json');

/**
 * Gets Reddit Auto-Poster Configuration
 */
export function getRedditConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
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
 * Saves Reddit Auto-Poster Configuration
 */
export function saveRedditConfig(config) {
  try {
    const current = getRedditConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    console.log('✅ Saved Reddit Auto-Poster Configuration');
    return true;
  } catch (e) {
    console.error('Error saving Reddit config:', e);
    return false;
  }
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
      'User-Agent': 'NextGenTimesBot/1.0.0 (by /u/' + (config.username || 'NextGenTimes') + ')'
    },
    body: params.toString()
  });

  const data = await res.json();
  if (data.access_token) {
    return data.access_token;
  }
  throw new Error(data.error || data.message || 'Failed to authenticate with Reddit API');
}

/**
 * Automatically posts a published article link to Reddit
 */
export async function sendPostToReddit(post) {
  const config = getRedditConfig();

  if (!config.clientId || !config.clientSecret || !config.username || !config.password || !config.autoPostEnabled) {
    return { success: false, message: 'Reddit Auto-Poster not configured or disabled.' };
  }

  const domain = process.env.BASE_URL || 'https://primemedia.site';
  const postUrl = `${domain}/post/${post.slug}`;
  const targetSubreddit = (config.subreddit || `u_${config.username}`).replace(/^r\//, '').trim();

  try {
    console.log(`🤖 [Reddit Bot] Authenticating with Reddit API for /u/${config.username}...`);
    const accessToken = await getRedditAccessToken(config);

    const submitParams = new URLSearchParams({
      sr: targetSubreddit,
      kind: 'link',
      title: post.title,
      url: postUrl,
      resubmit: 'true',
      api_type: 'json'
    });

    console.log(`🤖 [Reddit Bot] Submitting link to r/${targetSubreddit}: "${post.title}"...`);
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NextGenTimesBot/1.0.0 (by /u/' + config.username + ')'
      },
      body: submitParams.toString()
    });

    const result = await response.json();
    const postDetails = result?.json?.data;
    const errors = result?.json?.errors;

    if (postDetails && postDetails.url) {
      console.log(`🔴 [Reddit Bot] SUCCESS! Post submitted to r/${targetSubreddit}: ${postDetails.url}`);
      return { success: true, message: `Successfully posted to r/${targetSubreddit}!`, permalink: postDetails.url };
    }

    if (errors && errors.length > 0) {
      const errString = errors.map(e => e.join(': ')).join(' | ');
      console.warn(`⚠️ [Reddit Bot] Warning: ${errString}`);
      return { success: false, message: `Reddit API Error: ${errString}` };
    }

    return { success: true, message: `Submitted to r/${targetSubreddit}` };
  } catch (e) {
    console.error('❌ Error in Reddit Bot:', e.message);
    return { success: false, message: e.message };
  }
}
