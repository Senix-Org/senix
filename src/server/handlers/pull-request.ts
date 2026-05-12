import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase';
import { enqueue, type JobPayloadMap } from '@/lib/queue';
import { findRepository } from './lookup';

/**
 * Handles pull_request events. Action set is intentionally narrow.
 * - opened: a new PR was created
 * - synchronize: new commits pushed to an existing PR
 * - reopened: a closed PR was reopened
 *
 * All other actions are ignored. Closed/merged PRs don't need analysis.
 */
const ACTIONS_WE_HANDLE = new Set(['opened', 'synchronize', 'reopened']);

export async function handlePullRequest(payload: any): Promise<string> {
  const action = payload.action as string;
  if (!ACTIONS_WE_HANDLE.has(action)) {
    return `pull_request:skipped:${action}`;
  }

  const pr = payload.pull_request;
  const repoPayload = payload.repository;
  const installationId = payload.installation?.id as number | undefined;

  if (!pr || !repoPayload || !installationId) {
    return 'pull_request:missing-fields';
  }

  const repo = await findRepository(repoPayload.id);
  if (!repo) return `pull_request:unknown-repo:${repoPayload.id}`;
  if (!repo.enabled) return `pull_request:repo-disabled:${repo.full_name}`;

  // Step 1: Upsert the PR row
  const { data: prRow, error: prError } = await supabaseAdmin
    .from('pull_requests')
    .upsert(
      {
        repository_id: repo.id,
        github_pr_number: pr.number,
        github_pr_id: pr.id,
        title: pr.title,
        author_login: pr.user?.login ?? null,
        state: pr.state,
        head_sha: pr.head.sha,
        base_sha: pr.base.sha,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'github_pr_id' }
    )
    .select()
    .single();

  if (prError || !prRow) {
    throw new Error(`Failed to upsert PR: ${prError?.message ?? 'unknown'}`);
  }

  // Step 2: Create the analysis row in queued state
  const { data: analysisRow, error: analysisError } = await supabaseAdmin
    .from('analyses')
    .insert({
      pull_request_id: prRow.id,
      commit_sha: pr.head.sha,
      status: 'queued',
    })
    .select()
    .single();

  if (analysisError || !analysisRow) {
    throw new Error(`Failed to create analysis: ${analysisError?.message ?? 'unknown'}`);
  }

  // Step 3: Dispatch the analysis job.
  //
  // Default path: fire-and-forget POST to the internal serverless route.
  // Vercel keeps the function alive after the webhook returns 200, so the
  // analysis runs without GitHub waiting on it.
  //
  // Fallback path: if the dispatch fails synchronously (bad URL, missing
  // secret) we push to the Redis queue so the standalone polling worker
  // can pick it up. This keeps the system functional even when the
  // serverless dispatch is misconfigured.
  const [owner, repoName] = repo.full_name.split('/');
  const jobPayload: JobPayloadMap['analyze-pr'] = {
    analysisId: analysisRow.id,
    pullRequestId: prRow.id,
    installationId,
    owner,
    repo: repoName,
    prNumber: pr.number,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
  };

  const dispatchOutcome = await dispatchAnalyzePr(jobPayload);

  return `pull_request:${action}:${repo.full_name}#${pr.number}:${dispatchOutcome}`;
}

type DispatchOutcome =
  | 'serverless-dispatched'
  | `queued:${string}`
  | 'dispatch-failed';

/**
 * Trigger the analysis. Wraps the fetch in Vercel's waitUntil so the
 * serverless function stays alive until the dispatch settles, even after
 * the webhook handler returns 200 to GitHub.
 *
 * If the fetch fails, fall back to the Redis queue so the polling worker
 * can still recover the job.
 */
async function dispatchAnalyzePr(
  payload: JobPayloadMap['analyze-pr']
): Promise<DispatchOutcome> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.INTERNAL_WORKER_SECRET;

  if (siteUrl && secret) {
    try {
      waitUntil(
        fetch(`${siteUrl}/api/internal/analyze-pr`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-senix-internal-secret': secret,
          },
          body: JSON.stringify(payload),
        }).catch((err) => {
          console.error('[pull-request] analyze-pr dispatch failed', {
            analysisId: payload.analysisId,
            message: err?.message ?? String(err),
          });
          // Fallback: enqueue to Redis so the worker can pick it up
          return enqueue('analyze-pr', payload);
        })
      );

      return 'serverless-dispatched';
    } catch (err: any) {
      console.error('[pull-request] failed to initiate analyze-pr fetch', {
        analysisId: payload.analysisId,
        message: err?.message ?? String(err),
      });
      // fall through to Redis fallback
    }
  } else {
    console.warn(
      '[pull-request] NEXT_PUBLIC_SITE_URL or INTERNAL_WORKER_SECRET missing; falling back to Redis queue'
    );
  }

  try {
    const jobId = await enqueue('analyze-pr', payload);
    return `queued:${jobId}`;
  } catch (err: any) {
    console.error('[pull-request] Redis fallback enqueue failed', {
      analysisId: payload.analysisId,
      message: err?.message ?? String(err),
    });
    return 'dispatch-failed';
  }
}
