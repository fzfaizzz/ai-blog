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
 * Sends a published article automatically to Telegram Channel
 */
export async function sendPostToTelegram(post) {
  const config = getTelegramConfig();
  if (!config.botToken || !config.channelId || !config.autoPostEnabled) {
    return { success: false, message: 'Telegram auto-posting not configured or disabled.' };
  }

  const domain = process.env.BASE_URL || 'https://nextgentimes.up.railway.app';
  const postUrl = `${domain}/post/${post.slug}`;
  
  const caption = `🚨 <b>BREAKING NEWS</b> 🚨\n\n<b>${post.title}</b>\n\n${post.metaDescription || ''}\n\n📖 <i>Read Full Investigative Story:</i>\n👉 <a href="${postUrl}">${postUrl}</a>\n\n#NextGenTimes #BreakingNews #TechTrends`;

  try {
    let apiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    let payload = {
      chat_id: config.channelId,
      text: caption,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    // If image URL is valid, use sendPhoto
    if (post.imageUrl && post.imageUrl.startsWith('http')) {
      apiUrl = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
      payload = {
        chat_id: config.channelId,
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
      console.log(`✈️ Successfully posted to Telegram Channel: ${post.title}`);
      return { success: true, message: 'Post sent to Telegram channel!' };
    } else {
      console.error('Telegram API error:', resData);
      return { success: false, message: resData.description || 'Failed to post to Telegram' };
    }
  } catch (e) {
    console.error('Error sending post to Telegram:', e);
    return { success: false, message: e.message };
  }
}
