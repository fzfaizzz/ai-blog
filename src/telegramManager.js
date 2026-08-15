import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/telegram_config.json');

/**
 * Gets Telegram Configuration
 */
export function getTelegramConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { botToken: '', channelId: '', autoPostEnabled: false };
}

/**
 * Saves Telegram Configuration
 */
export function saveTelegramConfig(config) {
  try {
    const current = getTelegramConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving Telegram config:', e);
    return false;
  }
}

const HISTORY_FILE = path.join(__dirname, '../data/telegram_history.json');

// Helper: Get Telegram History Tracker
function getTelegramHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return { lastPostedPerTarget: {}, dailyCounts: {}, date: new Date().toDateString() };
}

// Helper: Save Telegram History Tracker
function saveTelegramHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {}
}

/**
 * Sends a published article automatically to Category-Smart Telegram Channels / Groups with 100% Anti-Spam Protection
 */
export async function sendPostToTelegram(post) {
  const config = getTelegramConfig();
  if (!config.botToken || !config.autoPostEnabled) {
    return { success: false, message: 'Telegram auto-posting not configured or disabled.' };
  }

  // 1. Gather all default / global channels
  let targetList = String(config.channelId || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);

  // 2. Category-Smart Routing Engine
  const categoryRouting = config.categoryRouting || {};
  const postCat = (post.category || '').toLowerCase();

  let categorySpecificTargets = [];

  if (postCat.includes('movie') || postCat.includes('entertainment') || postCat.includes('cinema') || postCat.includes('hollywood') || postCat.includes('bollywood') || postCat.includes('ott')) {
    categorySpecificTargets = String(categoryRouting.movies || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
  } else if (postCat.includes('ai') || postCat.includes('tech') || postCat.includes('cyber') || postCat.includes('gadget') || postCat.includes('software')) {
    categorySpecificTargets = String(categoryRouting.tech || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
  } else if (postCat.includes('business') || postCat.includes('market') || postCat.includes('crypto') || postCat.includes('stock') || postCat.includes('finance') || postCat.includes('economy')) {
    categorySpecificTargets = String(categoryRouting.business || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
  } else if (postCat.includes('world') || postCat.includes('politics') || postCat.includes('global') || postCat.includes('breaking')) {
    categorySpecificTargets = String(categoryRouting.world || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
  }

  // Combine targets while avoiding duplicates
  const finalTargets = [...new Set([...targetList, ...categorySpecificTargets])];

  if (finalTargets.length === 0) {
    return { success: false, message: 'No target Telegram channels/groups configured for this category.' };
  }

  // 🛡️ Anti-Spam & Rate-Limiter Engine
  const history = getTelegramHistory();
  const todayStr = new Date().toDateString();
  if (history.date !== todayStr) {
    history.dailyCounts = {};
    history.date = todayStr;
  }

  const now = Date.now();
  const MIN_COOLDOWN_MS = (config.cooldownMinutes || 60) * 60 * 1000; // Default: 60 minutes cooldown per group
  const MAX_DAILY_POSTS_PER_GROUP = config.maxDailyPosts || 6; // Max 6 curated posts per group per day

  const domain = process.env.BASE_URL || 'https://primemedia.site';
  const postUrl = `${domain}/post/${post.slug}`;
  
  const caption = `🔥 <b>${post.title}</b>\n\n${post.metaDescription || ''}\n\n📖 <i>Read Full Story & Updates:</i>\n👉 <a href="${postUrl}">${postUrl}</a>\n\n#PrimeMedia #News #Breaking`;

  const results = [];

  for (const target of finalTargets) {
    // 🛡️ Check Cooldown & Daily Limits for this target
    const lastPosted = history.lastPostedPerTarget[target] || 0;
    const dailyCount = history.dailyCounts[target] || 0;

    // Skip if posted within cooldown window (prevents spamming groups!)
    if (now - lastPosted < MIN_COOLDOWN_MS) {
      const waitMin = Math.ceil((MIN_COOLDOWN_MS - (now - lastPosted)) / (60 * 1000));
      console.log(`🛡️ [Anti-Spam Shield] Cooldown active for ${target}. Skipping (Next available in ${waitMin} mins).`);
      results.push({ target, skipped: true, reason: `Cooldown active (${waitMin} mins remaining)` });
      continue;
    }

    // Skip if daily group post limit reached
    if (dailyCount >= MAX_DAILY_POSTS_PER_GROUP) {
      console.log(`🛡️ [Anti-Spam Shield] Daily limit reached (${MAX_DAILY_POSTS_PER_GROUP} posts) for ${target}. Skipping.`);
      results.push({ target, skipped: true, reason: 'Daily limit reached' });
      continue;
    }

    try {
      let apiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
      let payload = {
        chat_id: target,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };

      // If image URL is valid, use sendPhoto
      if (post.imageUrl && post.imageUrl.startsWith('http')) {
        apiUrl = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
        payload = {
          chat_id: target,
          photo: post.imageUrl,
          caption: caption,
          parse_mode: 'HTML'
        };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.ok) {
        console.log(`✈️ [Telegram Bot] Successfully posted to ${target} (${post.category || 'General'}): "${post.title}"`);
        results.push({ target, success: true });
        
        // Update Anti-Spam History Ledger
        history.lastPostedPerTarget[target] = now;
        history.dailyCounts[target] = dailyCount + 1;
        saveTelegramHistory(history);
      } else {
        console.warn(`⚠️ [Telegram Bot] Warning for ${target}:`, resData.description);
        results.push({ target, success: false, error: resData.description });
      }

      // Stagger delay between groups (3 seconds) to prevent simultaneous blast flags
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ [Telegram Bot] Error for ${target}:`, err.message);
      results.push({ target, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    message: `Anti-Spam Protected Broadcast sent to ${successCount} group(s)!`,
    results
  };
}
