// Official Microsoft Bing & Search Engines IndexNow Automated Protocol
// Supports: Bing, DuckDuckGo, Yahoo, Yandex, Seznam, Naver

const INDEXNOW_KEY = '77177bd8efd14f0e9f108cc0749674ce';
const DOMAIN = 'primemedia.site';
const KEY_LOCATION = `https://${DOMAIN}/${INDEXNOW_KEY}.txt`;

/**
 * Submit one or multiple URLs to IndexNow for instantaneous search engine indexing
 * @param {string|string[]} urlOrUrls - Single URL string or array of full URL strings
 * @returns {Promise<boolean>}
 */
export async function submitUrlToIndexNow(urlOrUrls) {
  if (!urlOrUrls) return false;
  const urlList = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  if (urlList.length === 0) return false;

  const payload = {
    host: DOMAIN,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 200 || response.status === 202) {
      console.log(`⚡ [IndexNow] Successfully submitted ${urlList.length} URL(s) to Bing, DuckDuckGo & Search Engines! (Status: ${response.status})`);
      return true;
    } else {
      const errText = await response.text().catch(() => '');
      console.warn(`⚠️ [IndexNow] Submission response ${response.status}: ${errText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ [IndexNow] Network error submitting URLs:', error.message);
    return false;
  }
}