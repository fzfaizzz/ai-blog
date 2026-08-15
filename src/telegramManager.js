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

/**
 * Sends a published article automatically to ALL configured Telegram Channels / Groups (100% Free Multi-Group Broadcast)
 */
export async function sendPostToTelegram(post) {
  const config = getTelegramConfig();
  if (!config.botToken || !config.channelId || !config.autoPostEnabled) {
    return { success: false, message: 'Telegram auto-posting not configured or disabled.' };
  }

  // Support multiple target channels/groups separated by comma or newlines
  const rawTargets = String(config.channelId).split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
  if (rawTargets.length === 0) {
    return { success: false, message: 'No target Telegram channels/groups specified.' };
  }

  const domain = process.env.BASE_URL || 'https://primemedia.site';
  const postUrl = `${domain}/post/${post.slug}`;
  
  const caption = `🔥 <b>${post.title}</b>\n\n${post.metaDescription || ''}\n\n📖 <i>Read Full Story & Updates:</i>\n👉 <a href="${postUrl}">${postUrl}</a>\n\n#PrimeMedia #News #Breaking #Movies`;

  const results = [];

  for (const target of rawTargets) {
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
        console.log(`✈️ [Telegram Bot] Successfully posted to ${target}: "${post.title}"`);
        results.push({ target, success: true });
      } else {
        console.warn(`⚠️ [Telegram Bot] Failed for ${target}:`, resData.description);
        results.push({ target, success: false, error: resData.description });
      }
    } catch (err) {
      console.error(`❌ [Telegram Bot] Error for ${target}:`, err.message);
      results.push({ target, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    message: `Broadcasted to ${successCount}/${rawTargets.length} Telegram group(s)/channel(s)!`,
    results
  };
}
