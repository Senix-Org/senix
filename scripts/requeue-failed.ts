import 'dotenv/config';
import { enqueue } from '../src/lib/queue';
import { supabaseAdmin } from '../src/lib/supabase';

type FailedAnalysisRow = {
  id: string;
  pull_request_id: string | null;
};

type PrJoinRow = {
  github_pr_number: number;
  head_sha: string;
  base_sha: string;
  repositories: {
    full_name: string;
    installations: { github_installation_id: number } | null;
  } | null;
};

/**
 * Requeue every analysis that failed in the last 24 hours.
 *
 * For each failed row we re-resolve the PR + repo + installation, push a
 * fresh `analyze-pr` job onto the queue, and reset the analysis row back to
 * `queued` with `error_message` cleared. Rows whose joined data is missing
 * (no PR, no repo, no installation) are skipped, not requeued.
 */
async function main(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: failedRows, error: failedError } = await supabaseAdmin
    .from('analyses')
    .select('id, pull_request_id')
    .eq('status', 'failed')
    .gt('created_at', cutoff);

  if (failedError) {
    throw new Error(`Failed to query failed analyses: ${failedError.message}`);
  }

  const failed = (failedRows ?? []) as unknown as FailedAnalysisRow[];

  let requeued = 0;
  let skipped = 0;

  for (const analysis of failed) {
    if (!analysis.pull_request_id) {
      skipped++;
      continue;
    }

    const { data: prRow } = await supabaseAdmin
      .from('pull_requests')
      .select(
        'github_pr_number, head_sha, base_sha, repositories(full_name, installations(github_installation_id))'
      )
      .eq('id', analysis.pull_request_id)
      .single();

    const pr = prRow as unknown as PrJoinRow | null;
    if (!pr || !pr.repositories || !pr.repositories.installations) {
      skipped++;
      continue;
    }

    const [owner, repoName] = pr.repositories.full_name.split('/');

    await enqueue('analyze-pr', {
      analysisId: analysis.id,
      pullRequestId: analysis.pull_request_id,
      installationId: pr.repositories.installations.github_installation_id,
      owner,
      repo: repoName,
      prNumber: pr.github_pr_number,
      headSha: pr.head_sha,
      baseSha: pr.base_sha,
    });

    const { error: updateError } = await supabaseAdmin
      .from('analyses')
      .update({ status: 'queued', error_message: null })
      .eq('id', analysis.id);

    if (updateError) {
      throw new Error(
        `Job enqueued but failed to reset analysis ${analysis.id}: ${updateError.message}`
      );
    }

    requeued++;
  }

  console.log(`Done. ${requeued} requeued, ${skipped} skipped due to missing data.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
