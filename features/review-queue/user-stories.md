# Review Queue, User Stories

The review queue decouples receiving a PR event from doing the expensive analysis. It holds the Upstash Redis queue primitives (`queue.ts`) and the worker that processes `analyze-pr` jobs (`worker/`). The primary path is now a fire and forget serverless function; the standalone worker is a fallback. Our goal versus CodeRabbit is faster time to first comment with no dropped reviews.

## Story 1: A PR analysis must not block the webhook

1. Who: The webhook handler.
2. What they expect: To hand off work and return 200 immediately.
3. Success: A queued analysis row plus an enqueued job let analysis run out of band.
4. Failure and handling: If enqueue fails, the analysis row still exists as queued and can be requeued.

## Story 2: A job fails transiently and should retry

1. Who: The worker processing a job that hits a temporary GitHub or LLM error.
2. What they expect: A bounded retry, not an infinite loop and not a permanent drop.
3. Success: `nackJob` retries up to a cap, then drops with the failure recorded.
4. Failure and handling: Drops are visible via the internal queue status route and can be requeued manually.

## Story 3: Operator wants to see queue health

1. Who: The Senix team.
2. What they expect: Visibility into pending, failed, and processed counts.
3. Success: The internal queue route exposes status; the worker emits heartbeat logs with running totals.
4. Failure and handling: If Redis is unreachable, the worker logs the error and keeps polling rather than crash looping.

## Story 4: The worker is restarted mid job

1. Who: The deployment platform during a deploy.
2. What they expect: No corrupted state and a clean drain.
3. Success: Graceful shutdown drains in flight jobs within a timeout before exit.
4. Failure and handling: Jobs not acked return to the queue for reprocessing.

## Story 5: A flood of PRs arrives at once

1. Who: A busy org merging many branches.
2. What they expect: All PRs reviewed, just possibly slightly delayed.
3. Success: The queue absorbs the burst and the worker processes steadily; per plan review limits (billing) protect cost.
4. Failure and handling: Backpressure is the queue depth itself; nothing is dropped silently.
