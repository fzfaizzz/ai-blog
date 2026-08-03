import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/twitter_config.json');

/**
 * Gets Twitter/X Configuration
 */
export function getTwitterConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { apiKey: '', apiSecret: '', accessToken: '', accessSecret: '', autoPostEnabled: false };
}

/**
 * Saves Twitter/X Configuration
 */
export function saveTwitterConfig(config) {
  try {
    const current = getTwitterConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving Twitter config:', e);
    return false;
  }
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
 * Sends a published article automatically to Twitter / X
 */
export async function sendPostToTwitter(post) {
  const config = getTwitterConfig();
  if (!config.apiKey || !config.apiSecret || !config.accessToken || !config.accessSecret || !config.autoPostEnabled) {
    return { success: false, message: 'Twitter auto-posting not configured or disabled.' };
  }

  const domain = process.env.BASE_URL || 'https://nextgentimes.up.railway.app';
  const postUrl = `${domain}/post/${post.slug}`;

  // Dynamic High-Traffic Viral Hashtags Selector
  const keywordTags = [];
  const lowerTitle = (post.title + ' ' + (post.metaDescription || '')).toLowerCase();

  if (lowerTitle.includes('ai') || lowerTitle.includes('gpt') || lowerTitle.includes('claude') || lowerTitle.includes('deepseek') || lowerTitle.includes('openai')) {
    keywordTags.push('#AINews', '#ArtificialIntelligence', '#DeepSeek', '#OpenAI');
  }
  if (lowerTitle.includes('spacex') || lowerTitle.includes('musk') || lowerTitle.includes('nasa') || lowerTitle.includes('space') || lowerTitle.includes('rocket')) {
    keywordTags.push('#SpaceX', '#ElonMusk', '#SpaceNews', '#NASA');
  }
  if (lowerTitle.includes('stock') || lowerTitle.includes('market') || lowerTitle.includes('bank') || lowerTitle.includes('economy') || lowerTitle.includes('wall street')) {
    keywordTags.push('#StockMarket', '#Markets', '#Economy', '#Finance');
  }
  if (lowerTitle.includes('crypto') || lowerTitle.includes('btc') || lowerTitle.includes('bitcoin')) {
    keywordTags.push('#Crypto', '#Bitcoin', '#Web3');
  }
  if (lowerTitle.includes('tech') || lowerTitle.includes('apple') || lowerTitle.includes('google') || lowerTitle.includes('nvidia') || lowerTitle.includes('chip')) {
    keywordTags.push('#TechNews', '#Innovation', '#NVIDIA', '#Tech');
  }
  if (lowerTitle.includes('trump') || lowerTitle.includes('china') || lowerTitle.includes('us') || lowerTitle.includes('war') || lowerTitle.includes('russia')) {
    keywordTags.push('#BreakingNews', '#WorldNews', '#GlobalAffairs');
  }

  // Fallback viral tags
  if (keywordTags.length === 0) {
    keywordTags.push('#BreakingNews', '#Trending', '#WorldNews', '#TechNews');
  }

  keywordTags.push('#NextGenTimes', '#Viral');
  const hashtags = [...new Set(keywordTags)].slice(0, 5).join(' ');
  const shortDesc = post.metaDescription ? post.metaDescription.substring(0, 95) + '...' : '';

  const tweetText = `🚨 BREAKING: ${post.title}\n\n${shortDesc}\n\n📖 Read full story 👇\n${postUrl}\n\n${hashtags}`;

  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';

    const params = {
      oauth_consumer_key: config.apiKey,
      oauth_token: config.accessToken
    };

    const authHeader = generateOAuthHeader(method, url, params, config.apiSecret, config.accessSecret);

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
      console.log(`🐥 Successfully tweeted to Twitter/X: ${post.title}`);
      return { success: true, message: `Tweet posted successfully! (ID: ${resData.data.id})` };
    } else {
      console.error('Twitter API error:', resData);
      return { success: false, message: resData.detail || resData.title || resData.errors?.[0]?.message || JSON.stringify(resData) };
    }
  } catch (e) {
    console.error('Error sending post to Twitter:', e);
    return { success: false, message: e.message };
  }
}
