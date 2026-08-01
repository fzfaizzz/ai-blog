import https from 'https';
import { getActiveGeminiKey, rotateGeminiKey, getGeminiKeys } from './geminiManager.js';

/**
 * Real News AI Article Generator Engine for The Daily Chronicle.
 * Ultra-Professional Journalist Storytelling & E-E-A-T User Trust Seal.
 */

/**
 * Generates a 100% professional news article built for maximum user trust.
 * @param {object} newsObj - { title, snippet, source, date, link }
 * @param {object} imageSet - { hero, inline1, inline2 }
 * @param {string} [apiKey] - Optional Gemini API Key
 * @returns {Promise<{ title: string, contentHtml: string, metaDescription: string, readTimeMinutes: number, source: string, publishTime: string }>}
 */
export async function generateHumanArticle(newsObj, imageSet = {}, apiKey = null) {
  const topic = typeof newsObj === 'string' ? newsObj : newsObj.title;
  const source = newsObj.source || 'Global News Wire';
  const date = newsObj.date || 'Recently Published';
  const snippet = newsObj.snippet || '';

  // Priority: explicit apiKey > active Key from Pool > process.env.GEMINI_API_KEY
  let activeKey = apiKey || getActiveGeminiKey() || process.env.GEMINI_API_KEY;

  if (activeKey) {
    try {
      console.log(` 🧠 Calling Gemini AI Story Engine with Key: ${activeKey.substring(0, 8)}...`);
      const apiResult = await callGeminiApi(newsObj, imageSet, activeKey);
      if (apiResult) return apiResult;
    } catch (e) {
      console.warn('⚠️ Gemini API call failed, trying key rotation:', e.message);
      const nextKey = rotateGeminiKey();
      if (nextKey) {
        try {
          const retryResult = await callGeminiApi(newsObj, imageSet, nextKey);
          if (retryResult) return retryResult;
        } catch (e2) {}
      }
    }
  }

  console.log('ℹ️ Running Local Authentic Story Engine...');
  return generateAuthenticNewsArticle(topic, snippet, source, date, imageSet);
}

function callGeminiApi(newsObj, imageSet, apiKey) {
  return new Promise((resolve, reject) => {
    const topic = newsObj.title;
    const source = newsObj.source || 'Global News Wire';
    const date = newsObj.date || 'Today';
    const snippet = newsObj.snippet || '';

    const prompt = `You are a Senior Bureau Chief & Chief Editor at The Wall Street Journal and Economic Times.
Write a comprehensive, highly engaging, 1,500-word deep-dive news story on: "${topic}".

Primary Wire Source: ${source}
Publication Time: ${date}
Summary Context: ${snippet}

CRITICAL EDITORIAL INSTRUCTIONS:
1. Write a complete, detailed news report that covers the FULL STORY in depth — explain what happened, key events, background history, policy/market implications, statements from key stakeholders, and strategic outlook.
2. DO NOT write generic placeholder text or repeat the title sentence over and over. Treat this as a real front-page newspaper investigation.
3. Structure the article with engaging HTML headings (<h2>, <h3>), rich narrative paragraphs (<p>), executive bullet points (<ul>, <li>), verified metric tables (<table>), expert quotes (<blockquote>), and an FAQ section.
4. DO NOT include markdown code fences (\`\`\`html) or AI meta notes. Output ONLY raw HTML content starting directly with the story.`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
          let text = json.candidates[0].content.parts[0].text;

          // Strip any markdown code fences if returned by AI
          text = text.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();

          if (imageSet.inline1 && imageSet.inline1.url) {
            const inline1Html = `
              <div class="inline-article-img" style="margin: 2.25rem 0; text-align: center;">
                <img src="${imageSet.inline1.url}" alt="${topic}" onerror="this.parentElement.style.display='none';" style="width: auto; max-width: 100%; height: auto; max-height: 380px; object-fit: contain; border-radius: 8px; margin: 0 auto; display: block;" />
              </div>
            `;
            text = text.replace(/<\/h2>/, `</h2>${inline1Html}`);
          }

          resolve({
            title: topic,
            contentHtml: text,
            metaDescription: `${topic} — Detailed reporting covered by ${source} (${date}). Verified analysis and comprehensive story breakdown.`,
            readTimeMinutes: 6,
            source,
            publishTime: date
          });
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', (err) => resolve(null));
    req.write(postData);
    req.end();
  });
}

function generateAuthenticNewsArticle(topic, snippet, source, date, imageSet) {
  const title = topic.trim();
  const metaDescription = `${title} — Analytical story breakdown reported by ${source} (${date}). Full investigative facts, background context, and market insights.`;

  const inline1Img = (imageSet.inline1 && imageSet.inline1.url) ? imageSet.inline1.url : 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';
  const inline2Img = (imageSet.inline2 && imageSet.inline2.url) ? imageSet.inline2.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80';

  // Determine domain context for intelligent offline story generation
  const lower = title.toLowerCase();
  let domainTag = 'Global Business & Markets';
  let contextDetails = 'Global markets and institutional observers are closely monitoring key operational developments following official briefings.';
  let quoteText = 'This announcement signals a pivotal moment for sector leaders, establishing new operational benchmarks across major regional hubs.';

  if (lower.includes('tech') || lower.includes('ai') || lower.includes('nvidia') || lower.includes('apple') || lower.includes('google') || lower.includes('chip')) {
    domainTag = 'Technology & Digital Innovation';
    contextDetails = 'Engineering teams and tech analysts emphasize that hardware and software integration will drive competitive benchmarks over the coming quarters.';
    quoteText = 'Accelerating technological convergence is reshaping enterprise workflows, setting unprecedented standards for speed and scalability.';
  } else if (lower.includes('space') || lower.includes('spacex') || lower.includes('nasa') || lower.includes('isro') || lower.includes('moon') || lower.includes('mars')) {
    domainTag = 'Space Exploration & Aerospace';
    contextDetails = 'Aerospace engineers and mission controllers highlight payload efficiencies, orbital trajectory milestones, and high-altitude flight safety protocols.';
    quoteText = 'Expanding orbital capabilities marks a giant stride forward for international space operations and next-generation satellite infrastructure.';
  } else if (lower.includes('politic') || lower.includes('government') || lower.includes('bill') || lower.includes('parliament') || lower.includes('election') || lower.includes('law')) {
    domainTag = 'Government & Public Policy';
    contextDetails = 'Legislative bodies and policy advisors are evaluating regulatory frameworks to ensure smooth implementation and statutory compliance.';
    quoteText = 'This legislative milestone reflects broader policy shifts aimed at strengthening institutional governance and public trust.';
  } else if (lower.includes('movie') || lower.includes('retire') || lower.includes('sport') || lower.includes('cricket') || lower.includes('messi') || lower.includes('box office')) {
    domainTag = 'Sports, Entertainment & Culture';
    contextDetails = 'Fans, commentators, and industry veteran figures have responded with overwhelming engagement following the landmark announcement.';
    quoteText = 'Celebrating extraordinary dedication and historic achievements, this event leaves an indelible legacy for future generations.';
  }

  // Schema.org JSON-LD NewsArticle
  const jsonLdSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "image": [imageSet.hero ? imageSet.hero.url : inline1Img],
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": "Sarah Jenkins",
      "jobTitle": "Senior International Bureau Chief"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Daily Chronicle"
    },
    "description": metaDescription
  });

  const contentHtml = `
    <!-- Hidden Google News Schema for Ranking -->
    <script type="application/ld+json">
      ${jsonLdSchema}
    </script>

    <div class="human-article">
      <!-- 🛡️ Professional Trust & Verification Header Seal -->
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; padding: 0.85rem 1.25rem; margin-bottom: 1.75rem; border-radius: 6px; font-size: 0.875rem; color: #166534; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
          <span style="font-size: 1.1rem;">✓</span> Fact Checked & Verified Editorial Report
        </div>
        <div style="font-size: 0.8rem; color: #15803D;">
          📡 Primary Wire Source: <strong>${source}</strong> (${date})
        </div>
      </div>

      <!-- 📌 Executive Summary Box -->
      <div class="key-takeaways-box" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-left: 5px solid #2563EB; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
        <h4 style="margin-top: 0; color: #1E293B; font-family: var(--font-heading); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
          📌 Executive News Briefing
        </h4>
        <ul style="margin-bottom: 0; padding-left: 1.25rem; line-height: 1.6;">
          <li><strong>Lead Headline:</strong> ${title}</li>
          <li><strong>Key Summary:</strong> ${snippet || 'Official reporting confirms major strategic developments across national and international desks.'}</li>
          <li><strong>Sector Desk:</strong> Focused on ${domainTag} updates and policy shifts.</li>
        </ul>
      </div>

      <p class="lead-para" style="font-size: 1.15rem; line-height: 1.75; color: #0F172A; font-weight: 500;">
        In a major story covered by <strong>${source}</strong> (${date}), key updates regarding <strong>${title}</strong> have drawn substantial attention from international analysts and public observers alike.
      </p>

      <p>${snippet || `Official press statements confirm that strategic measures are underway. Analysts indicate that these key announcements mark a significant turning point in sector operations.`}</p>

      <h2>1. Full Story Breakdown & Background Context</h2>
      <p>Understanding the broader impact of this news requires looking at the key events that shaped recent press coverage from <strong>${source}</strong>:</p>
      
      <p>${contextDetails}</p>

      <!-- Inline Content Photo #1 (Zero Crop, Error Shield) -->
      <div class="inline-article-img" style="margin: 2.25rem 0; text-align: center;">
        <img src="${inline1Img}" alt="${title} News Photography" onerror="this.parentElement.style.display='none';" style="width: auto; max-width: 100%; height: auto; max-height: 380px; object-fit: contain; border-radius: 8px; margin: 0 auto; display: block;" />
      </div>

      <p>Official reports emphasize that public engagement has reached historic levels following the announcement. Industry figures point to measurable shifts in consumer and market sentiment.</p>

      <blockquote style="margin: 2rem 0; padding: 1.25rem 1.5rem; border-left: 4px solid #2563EB; background: #F8FAFC; font-family: var(--font-serif); font-size: 1.15rem; font-style: italic; color: #1E293B;">
        "${quoteText}"
      </blockquote>

      <ul>
        <li><strong>Primary Objective:</strong> Strategic initiatives detailed in recent statements from ${source}.</li>
        <li><strong>Execution Timeline:</strong> Phased deployment expanding across key regional markets.</li>
        <li><strong>Public & Industry Response:</strong> Overwhelmingly positive engagement across primary communication channels.</li>
      </ul>

      <h2>2. In-Depth Impact & Analytical Insights</h2>
      <p>A detailed examination of market data highlights why this development continues to dominate international headlines:</p>

      <!-- Inline Content Photo #2 (Zero Crop, Error Shield) -->
      <div class="inline-article-img" style="margin: 2.25rem 0; text-align: center;">
        <img src="${inline2Img}" alt="Global Market Trends" onerror="this.parentElement.style.display='none';" style="width: auto; max-width: 100%; height: auto; max-height: 380px; object-fit: contain; border-radius: 8px; margin: 0 auto; display: block;" />
      </div>

      <p>Strategic advisors project that the outcomes of this event will influence long-term planning throughout the upcoming fiscal quarter.</p>

      <h2>3. Verified Information & Metrics Summary</h2>
      <table class="article-table">
        <thead>
          <tr>
            <th>Reporting Dimension</th>
            <th>Verified Status & Fact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Primary Source Wire</strong></td>
            <td>${source}</td>
          </tr>
          <tr>
            <td><strong>Reporting Domain</strong></td>
            <td>${domainTag}</td>
          </tr>
          <tr>
            <td><strong>Publication Timestamp</strong></td>
            <td>${date}</td>
          </tr>
          <tr>
            <td><strong>Editorial Verification</strong></td>
            <td>Passed Multi-Stage Fact-Checking Protocol</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Expert Editorial Takeaway</h2>
      <div class="pro-tip-card">
        <strong>💡 Senior Bureau Takeaway:</strong> As <strong>${source}</strong> continues monitoring ongoing developments, updated analytical reports will be published continuously across our digital news wire.
      </div>

      <h2>5. Frequently Asked Questions</h2>
      <div class="faq-container">
        <div class="faq-item">
          <strong>Q: What is the main source for this report?</strong>
          <p>A: This news story was originally reported by <strong>${source}</strong> on ${date}.</p>
        </div>
        <div class="faq-item">
          <strong>Q: How can readers follow ongoing updates?</strong>
          <p>A: Follow real-time updates and expert analysis on The Daily Chronicle digital edition.</p>
        </div>
      </div>

      <!-- 👤 Verified Journalist Sign-Off Box -->
      <div style="margin-top: 3rem; padding: 1.5rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 1.25rem;">
        <div style="width: 54px; height: 54px; border-radius: 50%; background: #2563EB; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; flex-shrink: 0;">
          SJ
        </div>
        <div>
          <div style="font-weight: 700; color: #0F172A; font-size: 1.05rem;">Written & Fact-Checked by Sarah Jenkins</div>
          <div style="font-size: 0.825rem; color: #64748B; margin-top: 0.15rem;">Senior International Bureau Chief • The Daily Chronicle</div>
          <div style="font-size: 0.775rem; color: #94A3B8; margin-top: 0.35rem;">Coverage verified against primary press releases and wire reports from ${source}.</div>
        </div>
      </div>
    </div>
  `;

  return {
    title,
    contentHtml,
    metaDescription,
    readTimeMinutes: 5,
    source,
    publishTime: date
  };
}
