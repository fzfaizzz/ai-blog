import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const GEMINI_KEY = 'AIzaSyCKsoswky0Xu4tNnxD4CpF2fXXaRtSCa1w';
const MONGO_URI = 'mongodb+srv://akhtarfarhan251_db_user:HUEXPccjB9Wm1msH@cluster0.nfkigk7.mongodb.net/primemedia?retryWrites=true&w=majority&appName=Cluster0';

const FLAGSHIP_TOPICS = [
  {
    title: 'How to Run DeepSeek V3, Qwen 3 & Llama Locally on an 8GB or 16GB Laptop: Complete 2026 Setup Guide',
    slug: 'how-to-run-deepseek-qwen-llama-locally-8gb-16gb-laptop-guide',
    category: 'AI & Next-Gen Tech',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    promptFocus: 'a comprehensive, actionable, step-by-step engineering tutorial showing how to run local open-weight LLMs (DeepSeek V3 quantized, Qwen 2.5/3 7B/14B, Llama 3.3 8B) on consumer laptops with 8GB or 16GB RAM using Ollama, LM Studio, llama.cpp, and vLLM. Include VRAM calculations, GGUF quantization levels (Q4_K_M vs Q8), memory offloading, context window adjustments, and benchmark comparison table.'
  },
  {
    title: 'Top 10 Free AI Video Generators in 2026: No Watermarks, HD Export & Commercial Rights Tested',
    slug: 'top-10-free-ai-video-generators-2026-no-watermark-commercial-rights',
    category: 'Technology & Innovation',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    promptFocus: 'an exhaustive, high-dwell-time comparative review of the top 10 generative AI video creation tools in 2026 that offer free tiers or open weights without intrusive watermarks. Cover Kling AI, Runway Gen-3 Alpha, Luma Dream Machine, Pika 2.0, Haiper, CogVideoX, and Wan2.1. Include a detailed comparison table with rendering speed, maximum duration, resolution, audio sync, and commercial licensing.'
  },
  {
    title: 'The 2026 Playbook for Tech Stock Dollar-Cost Averaging: Compound Returns and Risk Mitigation in Megacap AI Equities',
    slug: 'tech-stock-dollar-cost-averaging-compound-returns-risk-mitigation-playbook-2026',
    category: 'Business & Markets',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    promptFocus: 'an authoritative, quantitative financial guide detailing dollar-cost averaging (DCA) strategies for tech investors navigating AI megacap equities (Nvidia, Microsoft, Apple, Alphabet, Amazon, Meta) and semiconductor ETFs. Include historical drawdown simulations, CAGR projections, inflation adjustment models, risk mitigation frameworks, and an investment comparison table.'
  }
];

function generateArticleWithGemini(topicObj) {
  return new Promise((resolve, reject) => {
    const prompt = `You are the Chief Technology Editor and Principal Systems Architect at Prime Media.
Write a comprehensive, authoritative, high-dwell-time, 1,300 to 1,600-word masterclass guide on:
"${topicObj.title}"

Topic Scope:
${topicObj.promptFocus}

CRITICAL EDITORIAL & HIGH-CPC ADSENSE GUIDELINES:
1. COMPREHENSIVE ACTIONABLE DEPTH: No fluff, no generic filler. Provide concrete commands, technical specs, numbers, pros/cons, and real-world advice.
2. HIGH-VALUE ADVERTISER INTENT: Naturally weave in high-CPC keywords (cloud compute instances, GPU memory allocation, enterprise scalability, SaaS subscription models, ETF expense ratios, quantitative portfolio allocation).
3. REQUIRED STRUCTURE:
   - Executive Summary (3-4 bullet takeaways)
   - In-Depth Technical Guide / Breakdown
   - Comprehensive Comparison Table (HTML <table>) with at least 5-6 rows and 4 columns
   - Step-by-Step Implementation or Strategy
   - "People Also Ask" (FAQ) Section with 4 detailed questions and authoritative answers
   - Future Outlook / Key Takeaways
4. FORMATTING: Return ONLY clean HTML content using <h2>, <h3>, <p>, <ul>, <li>, <table>, <strong>. DO NOT include <h1> (handled by template) and DO NOT wrap in markdown code fences (\`\`\`html). Output raw HTML starting directly with the first paragraph.`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            return reject(new Error(`Gemini API Error (${res.statusCode}): ` + JSON.stringify(json.error)));
          }
          if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
            return reject(new Error('Gemini API returned no candidates. Raw response: ' + data.slice(0, 300)));
          }

          const textParts = (json.candidates[0].content.parts || []).filter(p => p.text && !p.thought);
          let html = textParts.map(p => p.text).join('\n').trim();

          if (!html) {
            return reject(new Error('Gemini API returned no text parts: ' + data.slice(0, 300)));
          }

          // Clean markdown code blocks & HTML wrapper boilerplate if present
          html = html.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
          html = html.replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '').trim();

          // Inject Tool Callout Widget after first H2
          const toolBox = `
            <div class="article-tool-cta-box" style="margin: 2.2rem 0; padding: 1.35rem; background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 5px solid #2563EB; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
              <div>
                <span style="font-size: 0.75rem; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.06em;">⚡ Interactive Technical Utility</span>
                <h4 style="margin: 0.25rem 0; font-size: 1.05rem; font-weight: 800; color: #0F172A;">Test Our Free AI &amp; Tech Utilities Suite</h4>
                <p style="margin: 0; font-size: 0.85rem; color: #475569;">Calculate LLM API token costs, analyze article dwell-time, or simulate tech DCA returns.</p>
              </div>
              <a href="/tools.html" style="background: #2563EB; color: #FFF; padding: 0.65rem 1.25rem; border-radius: 6px; font-size: 0.88rem; font-weight: 700; text-decoration: none; white-space: nowrap;">Launch Free Tools &rarr;</a>
            </div>
          `;

          if (html.includes('</h2>')) {
            html = html.replace('</h2>', `</h2>\n${toolBox}\n`);
          } else {
            html = toolBox + html;
          }

          resolve(html);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

async function generateArticleWithRetry(topicObj) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await generateArticleWithGemini(topicObj);
    } catch (err) {
      console.warn(`   ⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 4) {
        console.log(`   ⏳ Backing off for 6 seconds before retry...`);
        await new Promise(r => setTimeout(r, 6000));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log('🚀 [Flagship Article Generator] Starting creation of 3 High-CPC Evergreen Guides...');

  const postsFilePath = path.join(ROOT_DIR, 'data/posts.json');
  let posts = JSON.parse(fs.readFileSync(postsFilePath, 'utf8'));

  const generatedPosts = [];

  for (let i = 0; i < FLAGSHIP_TOPICS.length; i++) {
    const t = FLAGSHIP_TOPICS[i];

    // If post already exists with >1500 words, reuse it without re-generating
    const existing = posts.find(p => p.slug === t.slug);
    if (existing && existing.contentHtml && existing.contentHtml.length > 3000) {
      console.log(`\n⏩ Article ${i + 1}/3 ("${t.title}") already generated (${existing.contentHtml.length} chars). Keeping!`);
      generatedPosts.push(existing);
      continue;
    }

    console.log(`\n✍️ Generating Article ${i + 1}/3: "${t.title}"...`);
    try {
      const contentHtml = await generateArticleWithRetry(t);
      const wordCount = contentHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      console.log(`   ✅ Success! Generated ${wordCount} words.`);

      // Extract opening paragraph for metaDescription
      const pMatch = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      let metaDesc = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 155) + '...' : t.title;

      const newPost = {
        id: Date.now() + i * 1000,
        slug: t.slug,
        title: t.title,
        metaDescription: metaDesc,
        contentHtml,
        imageUrl: t.imageUrl,
        imageCredit: 'Unsplash / Prime Media Tech Lab',
        category: t.category,
        readTimeMinutes: Math.max(6, Math.ceil(wordCount / 220)),
        views: 145 + i * 45,
        publishedAt: new Date(Date.now() - i * 3600000).toISOString()
      };

      // Remove any existing post with same slug
      posts = posts.filter(p => p.slug !== t.slug);
      posts.unshift(newPost);
      generatedPosts.push(newPost);
    } catch (err) {
      console.error(`   ❌ Error generating "${t.title}":`, err.message);
    }

    if (i < FLAGSHIP_TOPICS.length - 1) {
      console.log('   ⏳ Waiting 3 seconds before next generation...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`\n💾 Saved ${generatedPosts.length} flagship articles to local data/posts.json!`);

  // Sync directly with MongoDB Atlas
  try {
    console.log('🍃 Syncing flagship articles to MongoDB Atlas...');
    const client = new MongoClient(MONGO_URI, { tls: true, serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db('primemedia');
    const col = db.collection('posts');

    for (const gp of generatedPosts) {
      const cleanPost = { ...gp };
      delete cleanPost._id;
      await col.updateOne(
        { slug: cleanPost.slug },
        { $set: cleanPost },
        { upsert: true }
      );
      console.log(`   ✓ Synced to MongoDB: "${cleanPost.title}"`);
    }

    await client.close();
    console.log('✅ All flagship articles synced to cloud database!');
  } catch (dbErr) {
    console.warn('⚠️ MongoDB sync warning:', dbErr.message);
  }

  console.log('\n🎉 [Flagship Article Generator] Completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
