import 'dotenv/config';
import { dequeue, ackJob, nackJob, Job } from '../src/lib/queue';
import { processAnalyzePr } from './handlers/analyze-pr';

const POLL_INTERVAL_MS = 2000;
const SHUTDOWN_TIMEOUT_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

let shuttingDown = false;
let inFlight = 0;
let processedCount = 0;
let failedCount = 0;
let heartbeatTimer: NodeJS.Timeout | null = null;

async function processJob(job: Job): Promise<void> {
  const startedAt = Date.now();
  console.log(`[worker] picked up job ${job.id} (kind=${job.kind}, attempt=${job.attempts + 1})`);

  try {
    switch (job.kind) {
      case 'analyze-pr':
        await processAnalyzePr(job.payload);
        break;
      default: {
        // Exhaustiveness check
        const exhaustive: never = job.kind;
        throw new Error(`Unhandled job kind: ${exhaustive}`);
      }
    }
    await ackJob(job);
    processedCount++;
    console.log(`[worker] ✅ ${job.id} done in ${Date.now() - startedAt}ms`);
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const willRetry = await nackJob(job, message);
    failedCount++;
    console.error(
      `[worker] ❌ ${job.id} failed: ${message} — ${willRetry ? 'will retry' : 'dropped'}`
    );
  }
}

async function loop() {
  while (!shuttingDown) {
    const job = await dequeue();
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    inFlight++;
    processJob(job).finally(() => {
      inFlight--;
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Emit a periodic heartbeat with running totals so deployments without
 * structured metrics still surface "is the worker alive and healthy?" info
 * in plain logs. Counters are module-level and run for the lifetime of the
 * process; they reset on restart.
 */
function startHeartbeat(): void {
  heartbeatTimer = setInterval(() => {
    console.log(
      `[worker] heartbeat — processed=${processedCount} failed=${failedCount} inFlight=${inFlight}`
    );
  }, HEARTBEAT_INTERVAL_MS);
}

function setupShutdown() {
  const handler = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    console.log(`[worker] received ${signal}, draining ${inFlight} in-flight jobs...`);
    const start = Date.now();
    while (inFlight > 0 && Date.now() - start < SHUTDOWN_TIMEOUT_MS) {
      await sleep(200);
    }
    if (inFlight > 0) {
      console.warn(`[worker] forced exit with ${inFlight} jobs still running`);
    } else {
      console.log(
        `[worker] clean exit — processed=${processedCount} failed=${failedCount}`
      );
    }
    process.exit(0);
  };
  process.on('SIGINT', () => handler('SIGINT'));
  process.on('SIGTERM', () => handler('SIGTERM'));
}

async function main() {
  setupShutdown();
  startHeartbeat();
  console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms');
  await loop();
}

main().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
