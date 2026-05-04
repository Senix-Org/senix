import { supabaseAdmin } from '@/lib/supabase';
import { enqueue } from '@/lib/queue';
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

  // Step 3: Push the job onto the queue
  const [owner, repoName] = repo.full_name.split('/');
  const jobId = await enqueue('analyze-pr', {
    analysisId: analysisRow.id,
    pullRequestId: prRow.id,
    installationId,
    owner,
    repo: repoName,
    prNumber: pr.number,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
  });

  return `pull_request:${action}:${repo.full_name}#${pr.number}:queued:${jobId}`;
}