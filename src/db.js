import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MONGO_URI = 'mongodb+srv://akhtarfarhan251_db_user:HUEXPccjB9Wm1msH@cluster0.nfkigk7.mongodb.net/primemedia?retryWrites=true&w=majority&appName=Cluster0';
const MONGO_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

let client = null;
let db = null;
let isConnected = false;

// Fallback local paths
const DATA_DIR = path.join(__dirname, '../data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const GEMINI_FILE = path.join(DATA_DIR, 'gemini_keys.json');
const SERPER_FILE = path.join(DATA_DIR, 'serper_keys.json');

export async function connectDB() {
  if (isConnected && db) return db;
  try {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db('primemedia');
    isConnected = true;
    console.log('🍃 [MongoDB Atlas] Connected successfully to cloud database!');

    // Ensure indexes
    const postsCollection = db.collection('posts');
    await postsCollection.createIndex({ slug: 1 }, { unique: true, sparse: true }).catch(() => {});
    await postsCollection.createIndex({ id: 1 }).catch(() => {});
    await postsCollection.createIndex({ publishedAt: -1 }).catch(() => {});

    // Seed database if empty
    await autoSeedFromLocalFiles();

    return db;
  } catch (err) {
    console.error('⚠️ [MongoDB Atlas] Connection error (falling back to local JSON):', err.message);
    isConnected = false;
    return null;
  }
}

async function autoSeedFromLocalFiles() {
  try {
    if (!db) return;
    
    // Seed Settings & Keys only if missing in DB
    const settingsCollection = db.collection('settings');

    // 1. App Settings
    const existingSettings = await settingsCollection.findOne({ _id: 'app_settings' });
    if (!existingSettings && fs.existsSync(SETTINGS_FILE)) {
      try {
        const localSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        await settingsCollection.updateOne(
          { _id: 'app_settings' },
          { $set: { data: localSettings, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {}
    }

    // 2. Gemini Keys
    const existingGemini = await settingsCollection.findOne({ _id: 'gemini_keys' });
    if (!existingGemini && fs.existsSync(GEMINI_FILE)) {
      try {
        const localGemini = JSON.parse(fs.readFileSync(GEMINI_FILE, 'utf8'));
        await settingsCollection.updateOne(
          { _id: 'gemini_keys' },
          { $set: { data: localGemini, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {}
    }

    // 3. Serper Keys
    const existingSerper = await settingsCollection.findOne({ _id: 'serper_keys' });
    if (!existingSerper && fs.existsSync(SERPER_FILE)) {
      try {
        const localSerper = JSON.parse(fs.readFileSync(SERPER_FILE, 'utf8'));
        await settingsCollection.updateOne(
          { _id: 'serper_keys' },
          { $set: { data: localSerper, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {}
    }

  } catch (err) {
    console.error('AutoSeed error:', err);
  }
}

// ================= POSTS DB OPERATIONS =================

export async function dbGetAllPosts() {
  try {
    if (!isConnected) await connectDB();
    if (!db) return null;
    const posts = await db.collection('posts')
      .find({})
      .sort({ publishedAt: -1, id: -1 })
      .toArray();
    return posts.map(p => {
      const { _id, ...rest } = p;
      return rest;
    });
  } catch (err) {
    console.error('dbGetAllPosts error:', err);
    return null;
  }
}

export async function dbSavePost(post) {
  try {
    if (!isConnected) await connectDB();
    if (!db) {
      console.warn('⚠️ [MongoDB] Cannot save post: DB not connected');
      return false;
    }
    const cleanPost = { ...post };
    delete cleanPost._id;
    const res = await db.collection('posts').updateOne(
      { slug: cleanPost.slug },
      { $set: cleanPost },
      { upsert: true }
    );
    console.log(`🍃 [MongoDB] Saved post to cloud: "${cleanPost.title}" (upserted: ${res.upsertedId || res.modifiedCount > 0 || res.matchedCount > 0})`);
    return true;
  } catch (err) {
    console.error('❌ dbSavePost error:', err.message);
    return false;
  }
}

export async function dbDeletePost(identifier) {
  try {
    if (!isConnected) await connectDB();
    if (!db) return false;
    const res = await db.collection('posts').deleteOne({
      $or: [{ slug: identifier }, { id: Number(identifier) }, { id: String(identifier) }]
    });
    return res.deletedCount > 0;
  } catch (err) {
    console.error('dbDeletePost error:', err);
    return false;
  }
}

export async function dbTogglePostVisibility(identifier, isHidden) {
  try {
    if (!isConnected) await connectDB();
    if (!db) return false;
    await db.collection('posts').updateOne(
      { $or: [{ slug: identifier }, { id: Number(identifier) }, { id: String(identifier) }] },
      { $set: { hidden: isHidden } }
    );
    return true;
  } catch (err) {
    console.error('dbTogglePostVisibility error:', err);
    return false;
  }
}

export async function dbIncrementViews(slug) {
  try {
    if (!isConnected) await connectDB();
    if (!db) return;
    await db.collection('posts').updateOne(
      { slug },
      { $inc: { views: 1 } }
    );
  } catch (err) {}
}

// ================= SETTINGS DB OPERATIONS =================

export async function dbGetSetting(key) {
  try {
    if (!isConnected) await connectDB();
    if (!db) return null;
    const doc = await db.collection('settings').findOne({ _id: key });
    return doc ? doc.data : null;
  } catch (err) {
    console.error(`dbGetSetting(${key}) error:`, err);
    return null;
  }
}

export async function dbSaveSetting(key, data) {
  try {
    if (!isConnected) await connectDB();
    if (!db) return false;
    await db.collection('settings').updateOne(
      { _id: key },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error(`dbSaveSetting(${key}) error:`, err);
    return false;
  }
}