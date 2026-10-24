import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://akhtarfarhan251_db_user:HUEXPccjB9Wm1msH@cluster0.nfkigk7.mongodb.net/primemedia?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  console.log('🍃 Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGO_URI, { tls: true, serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db('primemedia');
  const col = db.collection('posts');

  const sensitivePattern = /\b(kill|killed|killing|dead|death|deaths|died|war|airstrike|strike|attacks|bomb|bombing|missile|flood|floods|earthquake|murder|jailed|prison|shooting|shooter|terror|terrorist|hostage|massacre|casualties|suicide|assault|crash|gunmen|headlines for|school assembly)\b/i;

  const allPosts = await col.find({}).toArray();
  console.log(`📦 Found ${allPosts.length} posts in MongoDB.`);

  let markedCount = 0;
  for (const p of allPosts) {
    const text = (p.contentHtml || '').replace(/<[^>]+>/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isSensitive = sensitivePattern.test(p.title || '');
    const isThin = wordCount < 600;

    if ((isSensitive || isThin) && !p.hidden) {
      await col.updateOne({ _id: p._id }, { $set: { hidden: true } });
      markedCount++;
    }
  }

  const activeCount = await col.countDocuments({ $or: [{ hidden: false }, { hidden: { $exists: false } }] });
  console.log(`✅ Marked ${markedCount} posts as hidden in MongoDB.`);
  console.log(`🌟 Total Active, High-Quality Visible Posts in DB: ${activeCount}`);

  await client.close();
  console.log('🎉 Database sync complete!');
}

main().catch(err => {
  console.error('❌ Error in sync_db_compliance:', err);
  process.exit(1);
});
