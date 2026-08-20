import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const CONFIG_FILE = path.join(DATA_DIR, 'userbot_config.json');
const HISTORY_FILE = path.join(DATA_DIR, 'userbot_history.json');

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
      return { success: false, message: 'No pending login session. Please click Send Login Code again.' };
    }

    const { client, apiId, apiHash, phoneNumber, phoneCodeHash } = pendingAuth;

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode: String(phoneCode).trim()
        })
      );
    } catch (err) {
      if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED') && password) {
        await client.signInWithPassword({
          apiId,
          apiHash,
          password
        });
      } else {
        throw err;
      }
    }

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

  if (isTest) {
    // On manual test button, include ALL groups across all categories for instant verification!
    const allCatGroups = [
      ...String(categoryRouting.movies || '').split(/[\n,]+/),
      ...String(categoryRouting.tech || '').split(/[\n,]+/),
      ...String(categoryRouting.business || '').split(/[\n,]+/),
      ...String(categoryRouting.world || '').split(/[\n,]+/)
    ].map(t => t.trim()).filter(Boolean);

    categorySpecificTargets = allCatGroups;
  } else {
    // On live automated publishing, strictly route by category!
    if (postCat.includes('movie') || postCat.includes('entertainment') || postCat.includes('cinema') || postCat.includes('hollywood') || postCat.includes('bollywood') || postCat.includes('ott')) {
      categorySpecificTargets = String(categoryRouting.movies || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    } else if (postCat.includes('ai') || postCat.includes('tech') || postCat.includes('cyber') || postCat.includes('gadget') || postCat.includes('software')) {
      categorySpecificTargets = String(categoryRouting.tech || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    } else if (postCat.includes('business') || postCat.includes('market') || postCat.includes('crypto') || postCat.includes('stock') || postCat.includes('finance') || postCat.includes('economy')) {
      categorySpecificTargets = String(categoryRouting.business || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    } else if (postCat.includes('world') || postCat.includes('politics') || postCat.includes('global') || postCat.includes('breaking')) {
      categorySpecificTargets = String(categoryRouting.world || '').split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    }
  }

  const finalTargets = [...new Set([...targetList, ...categorySpecificTargets])];

  if (finalTargets.length === 0) {
    return { success: false, message: 'No target Telegram groups configured for Userbot.' };
  }

  const numApiId = parseInt(config.apiId, 10);
  const session = new StringSession(config.sessionString);
  const client = new TelegramClient(session, numApiId, config.apiHash, {
    connectionRetries: 5,
  });

  const results = [];

  try {
    await client.connect();

    // Pre-download HD banner image buffer in memory
    let imgBuffer = null;
    if (post.imageUrl && (post.imageUrl.startsWith('http://') || post.imageUrl.startsWith('https://'))) {
      try {
        const imgRes = await fetch(post.imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (imgRes.ok) {
          const ab = await imgRes.arrayBuffer();
          imgBuffer = Buffer.from(ab);
          console.log(`🖼️ [Userbot] HD Banner fetched into memory (${imgBuffer.length} bytes)!`);
        }
      } catch (bufErr) {
        console.warn('⚠️ [Userbot] Could not fetch banner image buffer:', bufErr.message);
      }
    }

    // Fetch user's joined dialogs for smart entity matching
    const dialogs = await client.getDialogs({});

    // 🎯 STEP 1: Post Official Channel Post with HD Photo + Website Link
    let channelEntity = null;
    let channelPostMsgId = null;
    try {
      for (const d of dialogs) {
        const dId = String(d.id || '');
        const dTitle = (d.title || d.name || '').toLowerCase();
        if (dId === '-1004393806831' || dId === '4393806831' || dTitle.includes('prime media official')) {
          channelEntity = d.entity || d.inputEntity;
          break;
        }
      }

      if (!channelEntity) {
        try {
          channelEntity = await client.getEntity('@PrimeMediaOfficial');
        } catch (e) {
          channelEntity = await client.getEntity('-1004393806831');
        }
      }

      if (channelEntity) {
        // Check if message already exists
        const msgs = await client.getMessages(channelEntity, { limit: 15 });
        const targetTitleShort = (post.title || '').substring(0, 25).toLowerCase();
        const match = msgs.find(m => (m.message || '').toLowerCase().includes(targetTitleShort));
        
        if (match) {
          channelPostMsgId = match.id;
          console.log(`🎯 [Userbot] Found existing channel post ID: ${channelPostMsgId}`);
        } else {
          const channelCaption = `🔥 **${post.title}**\n\n${post.metaDescription || ''}\n\n📖 **Read Full Story & Analysis on Prime Media:**\n👉 ${postUrl}\n\n#PrimeMedia #News #Breaking`;
          
          let channelMsg = null;
          if (imgBuffer) {
            try {
              const channelFile = new CustomFile('banner.jpg', imgBuffer.length, '', imgBuffer);
              channelMsg = await client.sendFile(channelEntity, {
                file: channelFile,
                caption: channelCaption,
                parseMode: 'md'
              });
              console.log(`✓ [Userbot] Successfully posted HD Photo + Website Link to Official Channel!`);
            } catch (chPhotoErr) {
              console.warn('⚠️ [Userbot] Channel photo send warning:', chPhotoErr.message);
              channelMsg = await client.sendMessage(channelEntity, {
                message: channelCaption,
                parseMode: 'md',
                linkPreview: true
              });
            }
          } else {
            channelMsg = await client.sendMessage(channelEntity, {
              message: channelCaption,
              parseMode: 'md',
              linkPreview: true
            });
          }

          if (channelMsg) {
            channelPostMsgId = channelMsg.id;
            console.log(`✓ [Userbot] Channel post created with ID: ${channelPostMsgId}`);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [Userbot] Channel handler error:', e.message);
    }

    const channelHandle = '@PrimeMediaOfficial';
    const cleanTitle = (post.title || '').replace(/[*_`\[\]()]/g, '').trim();
    const cleanDesc = (post.metaDescription || '').replace(/[*_`\[\]()]/g, '').trim();

    // 🎯 STEP 2: Public Groups Call-To-Action (CTA) Format (100% Anti-Bot Safe: Zero URLs, Pure Clean @Mention)
    const humanTemplates = [
      (title, desc) => `🎬 **${title}**\n\n${desc ? desc.substring(0, 140) + '...' : ''}\n\n👉 Full story breakdown & verified updates posted here:\n📢 **${channelHandle}**\n\nWhat do you guys think about this?`,
      (title, desc) => `🔥 Breaking News: **${title}**\n\n${desc ? desc.substring(0, 140) + '...' : ''}\n\nCatch the complete coverage & official details:\n👉 **${channelHandle}**\n\nWhat are your thoughts?`,
      (title, desc) => `📌 Big Update: **${title}**!\n\nRead the full analytical story & key highlights:\n📢 Join & Read: **${channelHandle}**\n\nIs anyone else following this?`,
      (title, desc) => `Trending right now: **${title}**\n\n${desc ? desc.substring(0, 130) + '...' : ''}\n\nFull official story & facts:\n👉 **${channelHandle}**`,
      (title, desc) => `Check this out: **${title}**\n\nComplete breakdown, key data & source updates:\n📢 Official Channel: **${channelHandle}**`
    ];

    const randomTemplate = humanTemplates[Math.floor(Math.random() * humanTemplates.length)];
    const groupCtaMessage = randomTemplate(cleanTitle, cleanDesc);

    for (const target of finalTargets) {
      try {
        console.log(`🤖 [Userbot] Resolving target: "${target}"`);
        
        let targetEntity = null;
        const cleanTarget = target.trim();
        const cleanTargetNoAt = cleanTarget.startsWith('@') ? cleanTarget.substring(1) : cleanTarget;
        const numClean = cleanTarget.replace(/^-100/, '').replace(/^-/, '');

        // 1. Try matching by Title or ID in joined dialogs
        for (const d of dialogs) {
          const dId = String(d.id || '');
          const dTitle = (d.title || d.name || '').toLowerCase();
          const dUsername = (d.entity?.username || '').toLowerCase();

          if (
            dId === cleanTarget ||
            dId === `-100${numClean}` ||
            dId === `-${numClean}` ||
            dId === numClean ||
            (dUsername && dUsername === cleanTargetNoAt.toLowerCase()) ||
            (dTitle && dTitle === cleanTarget.toLowerCase()) ||
            (dTitle && dTitle.includes(cleanTarget.toLowerCase()))
          ) {
            targetEntity = d.entity || d.inputEntity;
            console.log(`✓ [Userbot] Matched dialog "${d.title || d.name}" (ID: ${d.id})`);
            break;
          }
        }

        // 2. Fallback to direct getEntity
        if (!targetEntity) {
          try {
            targetEntity = await client.getEntity(cleanTarget);
          } catch (e) {
            try {
              targetEntity = await client.getEntity(`-100${numClean}`);
            } catch (e2) {}
          }
        }

        if (!targetEntity) {
          throw new Error(`Group "${target}" not found in joined dialogs. Make sure your account has joined this group.`);
        }

        const matchedTitle = targetEntity.title || targetEntity.username || target;
        const isSourceChannel = String(targetEntity.id || '') === '-1004393806831' || String(targetEntity.id || '') === '4393806831' || matchedTitle.toLowerCase().includes('prime media');

        // If target is the official source channel, skip because already handled in STEP 1
        if (isSourceChannel) {
          console.log(`ℹ️ [Userbot] Skipping official channel "${matchedTitle}" (Already posted in Step 1)`);
          results.push({ target, matchedTitle, success: true, method: 'Official Channel' });
          continue;
        }

        // Simulate natural typing before posting
        try {
          await client.invoke(
            new Api.messages.SetTyping({
              peer: targetEntity,
              action: new Api.SendMessageTypingAction()
            })
          );
          await new Promise(r => setTimeout(r, 1500));
        } catch (typingErr) {}

        // 🖼️ Post HD Banner Photo + Clean @PrimeMediaOfficial CTA to Public Group (Zero External Links!)
        let sentWithPhoto = false;
        if (imgBuffer) {
          try {
            const groupFile = new CustomFile('banner.jpg', imgBuffer.length, '', imgBuffer);
            await client.sendFile(targetEntity, {
              file: groupFile,
              caption: groupCtaMessage,
              parseMode: 'md'
            });
            sentWithPhoto = true;
            console.log(`✓ [Userbot] Successfully posted HD BANNER PHOTO + CTA to "${matchedTitle}"`);
          } catch (fileErr) {
            console.warn(`⚠️ [Userbot] Photo send failed for "${matchedTitle}" (${fileErr.message}), falling back to text CTA...`);
          }
        }

        if (!sentWithPhoto) {
          await client.sendMessage(targetEntity, {
            message: groupCtaMessage,
            parseMode: 'md',
            linkPreview: true
          });
          console.log(`✓ [Userbot] Successfully sent CTA to "${matchedTitle}"`);
        }

        results.push({
          target,
          matchedTitle,
          success: true,
          method: sentWithPhoto ? 'HD Banner Poster + Channel CTA' : 'Clean Channel CTA'
        });

        // Natural Human Stagger Delay (5 seconds) between groups
        await new Promise(r => setTimeout(r, 5000));
      } catch (postErr) {
        let friendlyError = postErr.message;
        if (postErr.message.includes('CHAT_WRITE_FORBIDDEN') || postErr.message.includes('403')) {
          friendlyError = 'Group is locked by Admin / Requires human captcha solve in Telegram app';
        } else if (postErr.message.includes('SLOWMODE_WAIT')) {
          friendlyError = 'Group slowmode active';
        } else if (postErr.message.includes('FLOOD_WAIT')) {
          friendlyError = 'Telegram flood wait active';
        }
        console.warn(`⚠️ [Userbot] Warning for "${target}":`, friendlyError);
        results.push({ target, success: false, error: friendlyError });
      }
    }

    await client.disconnect();
  } catch (err) {
    console.error('Error connecting Userbot client:', err);
    return { success: false, message: err.message };
  }

  const successList = results.filter(r => r.success).map(r => `${r.matchedTitle} [${r.method}]`);
  const failList = results.filter(r => !r.success).map(r => `"${r.target}" (${r.error})`);

  if (successList.length > 0) {
    let msg = `✓ Successfully posted to: ${successList.join(', ')}`;
    if (failList.length > 0) msg += ` | Failed: ${failList.join(', ')}`;
    return { success: true, message: msg, results };
  } else {
    return { success: false, message: `Failed: ${failList.join(', ')}`, results };
  }
}
