import 'dotenv/config';
import { Redis } from '@upstash/redis';

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Missing UPSTASH env vars');
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  const queued = await redis.lrange('jobs:queue', 0, -1);
  const processing = await redis.lrange('jobs:processing', 0, -1);

  console.log(`\nQueue length: ${queued.length}`);
  for (const item of queued) {
    console.log('  →', typeof item === 'string' ? item.slice(0, 200) : item);
  }

  console.log(`\nProcessing length: ${processing.length}`);
  for (const item of processing) {
    console.log('  →', typeof item === 'string' ? item.slice(0, 200) : item);
  }

  console.log('\nAll keys matching jobs:*');
  const keys = await redis.keys('jobs:*');
  console.log('  ', keys);
}

main().catch((e) => { console.error(e); process.exit(1); });