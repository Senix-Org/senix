import { supabaseAdmin } from '@features/shared/supabase';

/**
 * Idempotency guard for GitHub webhook deliveries.
 *
 * GitHub retries deliveries (network blips, slow responses), and each
 * retry carries the same `x-github-delivery` id. Without a guard the same
 * pull_request event would be analyzed twice and could post a duplicate
 * comment. We treat a delivery id that already has a processed row in
 * `webhook_events` as a duplicate and skip re-processing.
 *
 * Returns true if this delivery has already been fully processed before.
 */
export async function isDuplicateDelivery(deliveryId: string): Promise<boolean> {
  const { data, error } = (await supabaseAdmin
    .from('webhook_events')
    .select('github_delivery_id, processed')
    .eq('github_delivery_id', deliveryId)
    .eq('processed', true)
    .maybeSingle()) as unknown as {
    data: { github_delivery_id: string; processed: boolean } | null;
    error: { message: string } | null;
  };

  if (error) {
    // Fail OPEN on a lookup error: a transient DB read failure should not
    // silently drop a real webhook. Worst case we re-process, which the
    // downstream comment-upsert and queue-claim guards already make safe.
    console.warn(`[webhook idempotency] lookup failed for ${deliveryId}: ${error.message}`);
    return false;
  }

  return data !== null;
}
