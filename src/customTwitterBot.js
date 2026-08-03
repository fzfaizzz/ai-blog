import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/twitter_config.json');

// Official Twitter Web Public Bearer Token (used by x.com web client)
const TWITTER_WEB_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

/**
 * Gets Custom Cookie Twitter Bot Configuration
 */
export function getCustomTwitterConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { authToken: '', csrfToken: '', autoPostEnabled: false };
}

/**
 * Saves Custom Cookie Twitter Bot Configuration
 */
export function saveCustomTwitterConfig(config) {
  try {
    const current = getCustomTwitterConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving Custom Twitter config:', e);
    return false;
  }
}

/**
 * Sends a tweet automatically via Twitter Web Cookie Session (0 API Fees)
 */
export async function sendTweetViaCookieSession(post) {
  const config = getCustomTwitterConfig();
  if (!config.authToken || !config.csrfToken || !config.autoPostEnabled) {
    return { success: false, message: 'Custom Twitter Bot not configured or disabled.' };
  }

  const domain = process.env.BASE_URL || 'https://nextgentimes.up.railway.app';
  const postUrl = `${domain}/post/${post.slug}`;

  // Dynamic Keyword Hashtags
  const keywordTags = [];
  const lowerTitle = (post.title + ' ' + (post.metaDescription || '')).toLowerCase();

  if (lowerTitle.includes('ai') || lowerTitle.includes('gpt') || lowerTitle.includes('deepseek') || lowerTitle.includes('openai')) {
    keywordTags.push('#AINews', '#DeepSeek', '#OpenAI');
  }
  if (lowerTitle.includes('spacex') || lowerTitle.includes('musk') || lowerTitle.includes('nasa') || lowerTitle.includes('space')) {
    keywordTags.push('#SpaceX', '#ElonMusk', '#SpaceNews');
  }
  if (lowerTitle.includes('stock') || lowerTitle.includes('market') || lowerTitle.includes('economy')) {
    keywordTags.push('#StockMarket', '#Markets', '#Economy');
  }
  if (lowerTitle.includes('crypto') || lowerTitle.includes('bitcoin')) {
    keywordTags.push('#Crypto', '#Bitcoin');
  }
  if (keywordTags.length === 0) {
    keywordTags.push('#BreakingNews', '#Trending', '#WorldNews');
  }
  keywordTags.push('#NextGenTimes', '#Viral');
  const hashtags = [...new Set(keywordTags)].slice(0, 5).join(' ');

  const shortDesc = post.metaDescription ? post.metaDescription.substring(0, 90) + '...' : '';
  const tweetText = `🚨 BREAKING: ${post.title}\n\n${shortDesc}\n\n📖 Read full story 👇\n${postUrl}\n\n${hashtags}`;

  try {
    // 1. Primary: Twitter Web Internal v1.1 Status Update Endpoint
    const v1Endpoint = 'https://x.com/i/api/1.1/statuses/update.json';
    const bodyParams = new URLSearchParams();
    bodyParams.append('status', tweetText);

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
      return { success: true, message: `Tweet posted successfully! (ID: ${resData.id_str || resData.id})` };
    }

    // 2. Fallback: GraphQL CreateTweet Endpoint
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
    resData = {};
    try { resData = JSON.parse(rawText); } catch(e) {}

    if (response.ok && (resData.data?.create_tweet || resData.data?.tweet_result)) {
      console.log(`🐥 Custom Cookie Bot successfully tweeted to X: ${post.title}`);
      return { success: true, message: 'Tweet posted successfully via Custom Server Bot!' };
    } else {
      console.error('Custom Twitter Bot error:', rawText);
      const errMsg = resData.errors?.[0]?.message || resData.message || (rawText ? rawText.substring(0, 120) : 'Invalid response');
      return { success: false, message: `Response Error: ${errMsg}` };
    }
  } catch (e) {
    console.error('Error in Custom Twitter Bot:', e);
    return { success: false, message: e.message };
  }
}
