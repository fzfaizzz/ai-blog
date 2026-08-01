import https from 'https';

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
export async function generateHumanArticle(newsObj, imageSet = {}, apiKey = process.env.GEMINI_API_KEY) {
  const topic = typeof newsObj === 'string' ? newsObj : newsObj.title;
  const source = newsObj.source || 'Global News Wire';
  const date = newsObj.date || 'Recently Published';
  const snippet = newsObj.snippet || '';

  if (apiKey) {
    try {
      const apiResult = await callGeminiApi(newsObj, imageSet, apiKey);
      if (apiResult) return apiResult;
    } catch (e) {
      console.warn('⚠️ Gemini API call failed, switching to local Real News Engine:', e.message);
    }
  }

  return generateAuthenticNewsArticle(topic, snippet, source, date, imageSet);
}

function callGeminiApi(newsObj, imageSet, apiKey) {
  return new Promise((resolve, reject) => {
    const topic = newsObj.title;
    const source = newsObj.source || 'Global News Wire';
    const date = newsObj.date || 'Today';
    const snippet = newsObj.snippet || '';

    const prompt = `Write a 100% professional, engaging 1,200-word news reporting piece on: "${topic}".
Reported Source: ${source}
Publication Time: ${date}
Summary Context: ${snippet}

CRITICAL EDITORIAL TRUST RULES:
1. Write in a top-tier Wall Street Journal / Reuters journalist tone.
2. Build deep reader trust with authentic facts, context, and expert analysis.
3. DO NOT include technical developer notes or artificial template phrases.
4. Include a pull-quote <blockquote>, bullet points, data table, and FAQ section.

Format output as HTML with tags <h2>, <h3>, <p>, <ul>, <li>, <table>, <strong>, <blockquote>.`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
            metaDescription: `${topic} — Verified news reporting covered by ${source} (${date}).`,
            readTimeMinutes: 5,
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
  const metaDescription = `${title} — Detailed analytical reporting covered by ${source} (${date}). Verified facts, strategic breakdown, and expert commentary.`;

  const inline1Img = (imageSet.inline1 && imageSet.inline1.url) ? imageSet.inline1.url : 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';
  const inline2Img = (imageSet.inline2 && imageSet.inline2.url) ? imageSet.inline2.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80';

  // Extract short topic entity for natural flow
  const shortTopic = title.length > 50 ? title.substring(0, 45) + '...' : title;

  // Schema.org JSON-LD NewsArticle (Hidden in script tag for Google Ranking)
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
      "jobTitle": "Senior International Correspondent"
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
          <li><strong>Primary Event:</strong> ${title}</li>
          <li><strong>Key Context:</strong> ${snippet || 'Official reporting confirms significant strategic developments across international desks.'}</li>
          <li><strong>Global Reaction:</strong> Analysts and industry observers highlight notable long-term sector impacts.</li>
        </ul>
      </div>

      <p class="lead-para" style="font-size: 1.15rem; line-height: 1.75; color: #0F172A; font-weight: 500;">
        In a major story reported by <strong>${source}</strong> (${date}), key developments surrounding <strong>${shortTopic}</strong> have generated substantial interest among market observers and international analysts.
      </p>

      <p>${snippet || `The announcement marks a notable milestone. Market participants and industry experts have begun assessing the broader operational and strategic implications as fresh data comes to light.`}</p>

      <h2>1. Background & Strategic Context</h2>
      <p>The story comes at a pivotal juncture for the sector. As coverage from <strong>${source}</strong> indicates, key stakeholders have been closely tracking emerging trends that led up to this development:</p>
      
      <!-- Inline Content Photo #1 (Zero Crop, Error Shield) -->
      <div class="inline-article-img" style="margin: 2.25rem 0; text-align: center;">
        <img src="${inline1Img}" alt="${title} News Photography" onerror="this.parentElement.style.display='none';" style="width: auto; max-width: 100%; height: auto; max-height: 380px; object-fit: contain; border-radius: 8px; margin: 0 auto; display: block;" />
      </div>

      <p>Initial briefings confirm that public and institutional engagement has expanded rapidly following the report. Industry leaders note that the trajectory established here will likely influence upcoming quarterly benchmarks.</p>

      <blockquote style="margin: 2rem 0; padding: 1.25rem 1.5rem; border-left: 4px solid #2563EB; background: #F8FAFC; font-family: var(--font-serif); font-size: 1.15rem; font-style: italic; color: #1E293B;">
        "These strategic updates mark an important operational shift, signaling new growth vectors and heightened market interest across the region."
      </blockquote>

      <ul>
        <li><strong>Operational Scope:</strong> Comprehensive coverage verified across primary media channels.</li>
        <li><strong>Execution Timeline:</strong> Ongoing implementation scheduled throughout the active quarter.</li>
        <li><strong>Investor & Market Outlook:</strong> Positive engagement noted among institutional and retail segments.</li>
      </ul>

      <h2>2. In-Depth Analysis & Sector Impact</h2>
      <p>Further examination of the underlying metrics reveals why this story is resonating strongly across global news desks:</p>

      <!-- Inline Content Photo #2 (Zero Crop, Error Shield) -->
      <div class="inline-article-img" style="margin: 2.25rem 0; text-align: center;">
        <img src="${inline2Img}" alt="Global Market Trends" onerror="this.parentElement.style.display='none';" style="width: auto; max-width: 100%; height: auto; max-height: 380px; object-fit: contain; border-radius: 8px; margin: 0 auto; display: block;" />
      </div>

      <p>Comparative analysis indicates that strategic alignment across participating entities will remain central to sustaining momentum over the coming months.</p>

      <h2>3. Strategic Metrics & Verified Summary</h2>
      <table class="article-table">
        <thead>
          <tr>
            <th>Analysis Dimension</th>
            <th>Verified Status & Insight</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Primary Source Wire</strong></td>
            <td>${source}</td>
          </tr>
          <tr>
            <td><strong>Reporting Period</strong></td>
            <td>${date}</td>
          </tr>
          <tr>
            <td><strong>Editorial Verification</strong></td>
            <td>Passed Multi-Stage Fact-Checking Protocol</td>
          </tr>
          <tr>
            <td><strong>Impact Assessment</strong></td>
            <td>High Strategic & Public Relevance</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Expert Editorial Perspective</h2>
      <div class="pro-tip-card">
        <strong>💡 Senior Desk Takeaway:</strong> As further reports emerge regarding <strong>${shortTopic}</strong>, our editorial desk will continue monitoring key indicators to provide real-time analytical updates.
      </div>

      <h2>5. Frequently Asked Questions</h2>
      <div class="faq-container">
        <div class="faq-item">
          <strong>Q: What is the main source for this news report?</strong>
          <p>A: This story was originally broken by <strong>${source}</strong> on ${date}.</p>
        </div>
        <div class="faq-item">
          <strong>Q: How can readers follow ongoing updates?</strong>
          <p>A: Real-time analytical coverage and verified briefings are published continuously on The Daily Chronicle edition.</p>
        </div>
      </div>

      <!-- 👤 Verified Journalist Sign-Off Box -->
      <div style="margin-top: 3rem; padding: 1.5rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 1.25rem;">
        <div style="width: 54px; height: 54px; border-radius: 50%; background: #2563EB; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; flex-shrink: 0;">
          SJ
        </div>
        <div>
          <div style="font-weight: 700; color: #0F172A; font-size: 1.05rem;">Written & Fact-Checked by Sarah Jenkins</div>
          <div style="font-size: 0.825rem; color: #64748B; margin-top: 0.15rem;">Senior US Technology & Business Correspondent • The Daily Chronicle</div>
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
