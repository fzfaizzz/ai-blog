import { getPostBySlugAsync } from '../src/publisher.js';
import { sendPostToTelegram } from '../src/telegramManager.js';

async function run() {
  const post = await getPostBySlugAsync('how-to-run-deepseek-qwen-llama-locally-8gb-16gb-laptop-guide');
  if (!post) {
    console.error('Post not found');
    process.exit(1);
  }
  console.log('Sending post to Telegram:', post.title);
  const result = await sendPostToTelegram(post, true);
  console.log('Telegram Result:', result);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
