import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../data/userbot_config.json');
const HISTORY_FILE = path.join(__dirname, '../data/userbot_history.json');

// Get Userbot Config
export function getUserbotConfig() {
  let config = {
    apiId: '',
    apiHash: '',
    phoneNumber: '',
    sessionString: '',
    autoPostEnabled: false,
    targetGroups: '',
    categoryRouting: {
      movies: '',
      tech: '',
      business: '',
      world: ''
    }
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...saved };
    }
  } catch (e) {}

  return config;
}

// Save Userbot Config
export function saveUserbotConfig(config) {
  try {
    const current = getUserbotConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving userbot config:', e);
    return false;
  }
}

// Temporary in-memory auth state
let pendingAuth = null;

/**
 * Step 1: Request OTP Code for User Account
 */
export async function sendUserbotAuthCode(apiId, apiHash, phoneNumber) {
  try {
    const numApiId = parseInt(apiId, 10);
    if (!numApiId || !apiHash || !phoneNumber) {
      return { success: false, message: 'Please provide valid API ID, API Hash, and Phone Number.' };
    }

    const session = new StringSession('');
    const client = new TelegramClient(session, numApiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    const { phoneCodeHash } = await client.sendCode(
      { apiId: numApiId, apiHash },
      phoneNumber
    );

    pendingAuth = {
      client,
      apiId: numApiId,
      apiHash,
      phoneNumber,
      phoneCodeHash
    };

    return { success: true, message: 'Login code sent to your Telegram app!' };
  } catch (err) {
    console.error('Error sending Telegram user auth code:', err);
    return { success: false, message: err.message || 'Failed to send login code.' };
  }
}

/**
 * Step 2: Verify OTP Code and Generate Permanent Session
 */
export async function verifyUserbotAuthCode(phoneCode, password = '') {
  try {
    if (!pendingAuth || !pendingAuth.client) {
      return { success: false, message: 'No pending login session. Please request code again.' };
    }

    const { client, apiId, apiHash, phoneNumber, phoneCodeHash } = pendingAuth;

    await client.invoke(
      new (await import('telegram/tl/index.js')).tl.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: String(phoneCode).trim()
      })
    ).catch(async (err) => {
      if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED') && password) {
        return await client.signInWithPassword({
          apiId,
          apiHash,
          password
        });
      }
      throw err;
    });

    const sessionString = client.session.save();
    
    saveUserbotConfig({
      apiId: String(apiId),
      apiHash,
      phoneNumber,
      sessionString,
      autoPostEnabled: true
    });

    // Clean up
    await client.disconnect();
    pendingAuth = null;

    return { success: true, message: 'Telegram User Account connected successfully and permanently!' };
  } catch (err) {
    console.error('Error verifying Telegram user code:', err);
    return { success: false, message: err.message || 'Invalid login code.' };
  }
}

/**
 * Sends a published article automatically to joined Public Groups via User Account
 */
export async function sendPostViaUserbot(post, isTest = false) {
  const config = getUserbotConfig();
  if (!config.apiId || !config.apiHash || !config.sessionString) {
    return { success: false, message: 'Telegram Userbot is not authenticated yet. Please login in Admin panel.' };
  }

  if (!isTest && !config.autoPostEnabled) {
    return { success: false, message: 'Telegram Userbot auto-posting is disabled in settings.' };
  }

  // 1. Gather all default / global channels
  let targetList = String(config.targetGroups || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);

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

  const finalTargets = [...new Set([...targetList, ...categorySpecificTargets])];

  if (finalTargets.length === 0) {
    return { success: false, message: 'No target Telegram groups configured for Userbot.' };
  }

  const domain = process.env.BASE_URL || 'https://primemedia.site';
  const postUrl = `${domain}/post/${post.slug}`;
  
  const messageText = `🔥 **${post.title}**\n\n${post.metaDescription || ''}\n\n📖 Read Full Story & Updates:\n👉 ${postUrl}\n\n#PrimeMedia #BreakingNews #Movies`;

  const numApiId = parseInt(config.apiId, 10);
  const session = new StringSession(config.sessionString);
  const client = new TelegramClient(session, numApiId, config.apiHash, {
    connectionRetries: 5,
  });

  const results = [];

  try {
    await client.connect();

    for (const target of finalTargets) {
      try {
        console.log(`🤖 [Userbot] Posting to target: ${target}`);
        
        let entity = target;
        if (target.startsWith('@')) {
          entity = target.replace('@', '');
        }

        await client.sendMessage(entity, {
          message: messageText,
          parseMode: 'md',
          linkPreview: true
        });

        console.log(`✓ [Userbot] Successfully posted to ${target}: "${post.title}"`);
        results.push({ target, success: true });

        // Natural Human Stagger Delay (5 seconds) between groups
        await new Promise(r => setTimeout(r, 5000));
      } catch (postErr) {
        console.warn(`⚠️ [Userbot] Warning for ${target}:`, postErr.message);
        results.push({ target, success: false, error: postErr.message });
      }
    }

    await client.disconnect();
  } catch (err) {
    console.error('Error connecting Userbot client:', err);
    return { success: false, message: err.message };
  }

  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    message: `Userbot posted to ${successCount}/${finalTargets.length} group(s)!`,
    results
  };
}
