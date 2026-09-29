import cron from 'node-cron';
import { getAllPosts } from './publisher.js';
import { sendPostToReddit, getRedditConfig, getRedditHistory } from './redditManager.js';
import { sendPostToTwitter, getTwitterConfig, getTwitterHistory } from './twitterManager.js';
import { sendTweetViaCookieSession, getCustomTwitterConfig, getCustomTwitterHistory } from './customTwitterBot.js';

let isRunningCycle = false;

/**
 * Starts the 24/7 Automated Social Syndication Engine
 * Automatically checks and syndicates published articles to Reddit and X (Twitter) at scheduled intervals.
 */
export function startSocialScheduler(intervalMinutes = 15) {
  const cronExpression = intervalMinutes >= 60
    ? `0 */${Math.floor(intervalMinutes / 60)} * * *`
    : `*/${intervalMinutes} * * * *`;

  console.log(`📡 24/7 Automated Social Syndication Engine Started! (Schedule: Every ${intervalMinutes} minute(s))`);

  // Run initial cycle 25 seconds after server startup
  setTimeout(() => {
    runSocialSyndicationCycle().catch(e => console.error('Social scheduler initial cycle error:', e));
  }, 25000);

  cron.schedule(cronExpression, () => {
    runSocialSyndicationCycle().catch(e => console.error('Social scheduler cron error:', e));
  });
}

/**
 * Runs a single automated social syndication cycle
 */
export async function runSocialSyndicationCycle() {
  if (isRunningCycle) return;
  isRunningCycle = true;

  try {
    const redditConfig = getRedditConfig();
    const twitterConfig = getTwitterConfig();
    const customTwitterConfig = getCustomTwitterConfig();

    const redditActive = !!redditConfig.autoPostEnabled;
    const twitterApiActive = !!twitterConfig.autoPostEnabled;
    const customTwitterActive = !!customTwitterConfig.autoPostEnabled;

    if (!redditActive && !twitterApiActive && !customTwitterActive) {
      // No social channels enabled for automatic syndication
      return;
    }

    const allPosts = getAllPosts(false);
    if (!allPosts || allPosts.length === 0) return;

    // Filter to fresh articles published in last 72 hours
    const threeDaysAgo = Date.now() - (72 * 60 * 60 * 1000);
    const candidatePosts = allPosts.filter(p => {
      const pubTime = new Date(p.publishedAt || 0).getTime();
      return pubTime > threeDaysAgo;
    });

    const postsToInspect = candidatePosts.length > 0 ? candidatePosts : allPosts.slice(0, 10);

    // 1. Reddit Automated Syndication
    if (redditActive) {
      const redditHistory = getRedditHistory();
      const postedSet = new Set(redditHistory.postedSlugs || []);
      const unpostedForReddit = postsToInspect.filter(p => !postedSet.has(p.slug));

      if (unpostedForReddit.length > 0) {
        const targetPost = unpostedForReddit[0];
        console.log(`\n===============================================================`);
        console.log(`⏰ [Social Autopilot]: Syndicating article to Reddit: "${targetPost.title}"`);
        const res = await sendPostToReddit(targetPost, false);
        if (res.success) {
          console.log(`✅ [Social Autopilot]: Posted to Reddit: ${res.message}`);
        } else {
          console.log(`ℹ️ [Social Autopilot]: Reddit submission skipped: ${res.message}`);
        }
        console.log(`===============================================================\n`);
      }
    }

    // 2. Twitter / X Automated Syndication
    if (customTwitterActive) {
      const customHistory = getCustomTwitterHistory();
      const postedSet = new Set(customHistory.postedSlugs || []);
      const unpostedForTwitter = postsToInspect.filter(p => !postedSet.has(p.slug));

      if (unpostedForTwitter.length > 0) {
        const targetPost = unpostedForTwitter[0];
        console.log(`\n===============================================================`);
        console.log(`⏰ [Social Autopilot]: Tweeting article via Custom Bot to X: "${targetPost.title}"`);
        const res = await sendTweetViaCookieSession(targetPost, false);
        if (res.success) {
          console.log(`✅ [Social Autopilot]: Tweeted to X: ${res.message}`);
        } else {
          console.log(`ℹ️ [Social Autopilot]: Custom Tweet skipped: ${res.message}`);
        }
        console.log(`===============================================================\n`);
      }
    } else if (twitterApiActive) {
      const twitterHistory = getTwitterHistory();
      const postedSet = new Set(twitterHistory.postedSlugs || []);
      const unpostedForTwitter = postsToInspect.filter(p => !postedSet.has(p.slug));

      if (unpostedForTwitter.length > 0) {
        const targetPost = unpostedForTwitter[0];
        console.log(`\n===============================================================`);
        console.log(`⏰ [Social Autopilot]: Tweeting article via API to X: "${targetPost.title}"`);
        const res = await sendPostToTwitter(targetPost, false);
        if (res.success) {
          console.log(`✅ [Social Autopilot]: Tweeted to X: ${res.message}`);
        } else {
          console.log(`ℹ️ [Social Autopilot]: Twitter API tweet skipped: ${res.message}`);
        }
        console.log(`===============================================================\n`);
      }
    }

  } catch (err) {
    console.error('❌ Social Syndication Cycle Error:', err.message);
  } finally {
    isRunningCycle = false;
  }
}

/**
 * 1-Click Broadcast: Posts a specific article immediately to all configured social platforms
 * @param {object} post - The article object
 */
export async function broadcastArticleToAllSocials(post) {
  const results = {
    reddit: { attempted: false, success: false, message: '' },
    twitterApi: { attempted: false, success: false, message: '' },
    customTwitter: { attempted: false, success: false, message: '' }
  };

  const redditConfig = getRedditConfig();
  const twitterConfig = getTwitterConfig();
  const customTwitterConfig = getCustomTwitterConfig();

  // 1. Reddit
  if (redditConfig.clientId && redditConfig.clientSecret && redditConfig.username && redditConfig.password) {
    results.reddit.attempted = true;
    try {
      const res = await sendPostToReddit(post, true);
      results.reddit.success = res.success;
      results.reddit.message = res.message;
    } catch (e) {
      results.reddit.message = e.message;
    }
  } else {
    results.reddit.message = 'Reddit bot not configured (missing credentials).';
  }

  // 2. Custom Twitter Bot (Preferred for zero fees)
  if (customTwitterConfig.authToken && customTwitterConfig.csrfToken) {
    results.customTwitter.attempted = true;
    try {
      const res = await sendTweetViaCookieSession(post, true);
      results.customTwitter.success = res.success;
      results.customTwitter.message = res.message;
    } catch (e) {
      results.customTwitter.message = e.message;
    }
  } else if (twitterConfig.apiKey && twitterConfig.apiSecret && twitterConfig.accessToken && twitterConfig.accessSecret) {
    // 3. Fallback to Twitter API v2
    results.twitterApi.attempted = true;
    try {
      const res = await sendPostToTwitter(post, true);
      results.twitterApi.success = res.success;
      results.twitterApi.message = res.message;
    } catch (e) {
      results.twitterApi.message = e.message;
    }
  } else {
    results.customTwitter.message = 'Twitter bot not configured (missing cookie session or API keys).';
  }

  return results;
}
