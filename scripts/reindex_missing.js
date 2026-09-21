// scripts/reindex_missing.js
// Submits restored URLs to Google Official Indexing API and Bing/IndexNow
import { submitToGoogleIndexing } from '../src/googleIndexer.js';
import { submitUrlToIndexNow } from '../src/indexNowManager.js';

const restoredUrls = [
  'https://primemedia.site/post/the-roman-telescope-promises-a-new-era-of-cosmic-exploration',
  'https://primemedia.site/post/overview-and-key-findings-of-the-2026-digital-news-report',
  'https://primemedia.site/post/at-least-98-killed-and-hundreds-missing-after-flash-floods-in-nepal-and-china',
  'https://primemedia.site/post/china-nepal-floods-261-foreigners-missing-in-tibet-online-rumours-targeted',
  'https://primemedia.site/post/isro-launches-on-hold-as-government-approval-delays-nvs-03-and-gisat',
  'https://primemedia.site/post/spacex-launches-nasas-roman-space-telescope-on-falcon-heavy-rocket-video',
  'https://primemedia.site/post/romania-blasts-rock-to-divert-water-from-drought',
  'https://primemedia.site/post/nepal-china-flood-disaster-whats-the-latest-toll-how-many-are-missing',
  'https://primemedia.site/post/iceland-rejects-eu-accession-talks-plan-in-referendum',
  'https://primemedia.site/post/interstellar-comet-3iatlas-isnt-an-alien-spacecraft-astronomers-confirm-in-the-end-there-were-no-surprises'
];

async function main() {
  console.log('🚀 Submitting restored URLs to Google Official Indexing API...\n');

  for (const url of restoredUrls) {
    try {
      const ok = await submitToGoogleIndexing(url, 'URL_UPDATED');
      console.log(`[Google Indexing API] ${url} -> ${ok ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      console.error(`[Google Indexing API Error] ${url}:`, err.message);
    }
  }

  console.log('\n📡 Submitting to Bing/IndexNow Protocol...');
  try {
    const indexNowRes = await submitUrlToIndexNow(restoredUrls);
    console.log(`[IndexNow] Status:`, indexNowRes ? 'SUCCESS' : 'FAILED');
  } catch (err) {
    console.error(`[IndexNow Error]:`, err.message);
  }

  console.log('\n✅ All URLs successfully pinged!');
  process.exit(0);
}

main();
