import cron from 'node-cron';
import { getTrendingTopics, fetchFullStoryDetails } from './trendFetcher.js';
import { generateHumanArticle } from './aiWriter.js';
import { getGoogleMatchingImages } from './googleImageFetcher.js';
import { getAllPosts, publishPost } from './publisher.js';

/**
 * 24/7 Autopilot Cron Scheduler.
 * Automatically runs every 5 minutes to discover breaking genuine news, fetch real photos, write articles, and auto-publish.
 */
export function startAutopilotCron(intervalMinutes = 5) {
  // Support both minute intervals (e.g. 5) and backward-compatible hour values
  const cronExpression = intervalMinutes >= 60 
    ? `0 */${Math.floor(intervalMinutes / 60)} * * *`
    : `*/${intervalMinutes} * * * *`;

  console.log(`🤖 24/7 Hands-Free Autopilot Scheduler Started! (Schedule: Every ${intervalMinutes} minute(s))`);

  // Run initial cycle 10 seconds after server startup
  setTimeout(() => {
    runAutopilotCycle();
  }, 10000);

  cron.schedule(cronExpression, () => {
    runAutopilotCycle();
  });
}

export async function runAutopilotCycle() {
  console.log('\n===============================================================');
  console.log('⏰ [24/7 Autopilot Cron Triggered]');
  console.log('===============================================================');
  try {
    const topics = await getTrendingTopics();
    const existingPosts = getAllPosts();
    const existingTitles = new Set(existingPosts.map(p => p.title.toLowerCase()));

    const freshTopics = topics.filter(t => !existingTitles.has(t.title.toLowerCase()));

    if (freshTopics.length === 0) {
      console.log('ℹ️ No new un-published trending topics found in this cycle.');
      return;
    }

    const targetItem = freshTopics[0];
    console.log(`1. Autopilot picked trending topic: "${targetItem.title}"`);

    // Fetch Full Story Context & Details
    const fullContext = await fetchFullStoryDetails(targetItem.title, targetItem.source);
    if (fullContext) targetItem.fullStoryText = fullContext;

    // Fetch Real HD Photos
    const images = await getGoogleMatchingImages(targetItem.title);
    
    // Write Human Article with Full Context
    const article = await generateHumanArticle(targetItem, images);

    // Auto Publish
    const post = await publishPost({
      title: article.title,
      contentHtml: article.contentHtml,
      metaDescription: article.metaDescription,
      imageUrl: images.hero.url,
      imageCredit: images.hero.credit,
      category: targetItem.category || 'World News',
      readTimeMinutes: article.readTimeMinutes
    });

    console.log(`✅ [Autopilot Success]: Published "${post.title}" [Slug: ${post.slug}]`);
    console.log('===============================================================\n');
  } catch (e) {
    console.error('❌ Autopilot Cron Error:', e.message);
  }
}
