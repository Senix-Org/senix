import { supabaseAdmin } from '@features/shared/supabase';
import { formatPRComment } from '@features/ai-engine/format-comment';
import { upsertPRComment } from '@features/github-integration/github-comments';
import { getAppBaseUrl } from '@features/shared/mcp-config';
import type { AnalysisResult } from '@features/ai-engine/llm/types';

export type PostMcpReviewInput = {
  /** App `users.id` resolved from the MCP token. */
  userId: string;
  /** Repository in `owner/name` form. */
  repoFullName: string;
  prNumber: number;
  result: AnalysisResult;
};

export type PostMcpReviewOutcome =
  | { posted: true; commentUrl: string }
  | { posted: false; reason: string };

type RepoLookupRow = {
  installations: {
    github_installation_id: number | null;
    installed_by_user_id: string | null;
    uninstalled_at: string | null;
  } | null;
};

/**
 * Best-effort: also post an MCP review as a GitHub PR comment.
 *
 * The editor chat is always the primary output; this is an optional
 * second delivery. It only fires when the request names a repo + PR AND
 * that repo belongs to a live GitHub installation owned by the token's
 * user. Any miss (no install linked, repo not owned, GitHub error) is
 * swallowed and reported as `posted: false` so the tool call never fails
 * on account of the comment.
 */
export async function postMcpReviewToGithub(
  input: PostMcpReviewInput
): Promise<PostMcpReviewOutcome> {
  const { userId, repoFullName, prNumber, result } = input;

  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    return { posted: false, reason: 'repo must be in owner/name form' };
  }

  const { data: repoRow } = (await supabaseAdmin
    .from('repositories')
    .select('installations(github_installation_id, installed_by_user_id, uninstalled_at)')
    .eq('full_name', repoFullName)
    .maybeSingle()) as unknown as { data: RepoLookupRow | null };

  const install = repoRow?.installations ?? null;
  if (!install || !install.github_installation_id) {
    return { posted: false, reason: 'no GitHub installation linked for this repo' };
  }
  if (install.uninstalled_at) {
    return { posted: false, reason: 'GitHub installation has been removed' };
  }
  if (install.installed_by_user_id !== userId) {
    return { posted: false, reason: 'repo is not owned by this user' };
  }

  const body = formatPRComment({
    summary: result.summary,
    riskLevel: result.riskLevel,
    riskFlags: result.riskFlags,
    focusAreas: result.focusAreas,
    provider: result.provider,
    tokensUsed: result.tokensUsed,
    costUsdCents: result.costUsdCents,
    dashboardUrl: `${getAppBaseUrl()}/dashboard`,
  });

  try {
    const { commentUrl } = await upsertPRComment({
      installationId: install.github_installation_id,
      owner,
      repo,
      prNumber,
      commentBody: body,
      existingCommentId: null,
    });
    return { posted: true, commentUrl };
  } catch (err) {
    return {
      posted: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
