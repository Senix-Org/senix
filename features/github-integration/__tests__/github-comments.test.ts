import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the first review POSTs a new PR comment, and a subsequent review
 * PATCHes (updates) the existing comment instead of creating a duplicate.
 * If the existing comment was deleted (404 on PATCH) it falls back to POST.
 * Failure means: every push would spam the PR with a new Senix comment.
 */

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@features/github-integration/github-app', () => ({
  getInstallationOctokit: () => ({ request }),
}));

import { upsertPRComment } from '@features/github-integration/github-comments';

beforeEach(() => request.mockReset());

const base = { installationId: 1, owner: 'o', repo: 'r', prNumber: 9, commentBody: 'body' };

describe('upsertPRComment', () => {
  it('creates a new comment on the first review (no existing id)', async () => {
    request.mockResolvedValue({ data: { id: 100, html_url: 'https://gh/c/100' } });
    const res = await upsertPRComment({ ...base, existingCommentId: null });
    expect(res.commentId).toBe(100);
    expect(request.mock.calls[0][0]).toContain('POST');
  });

  it('updates the existing comment on a subsequent review (no duplicate)', async () => {
    request.mockResolvedValue({ data: { id: 100, html_url: 'https://gh/c/100' } });
    const res = await upsertPRComment({ ...base, existingCommentId: 100 });
    expect(res.commentId).toBe(100);
    expect(request.mock.calls[0][0]).toContain('PATCH');
    // Exactly one request: an update, never a second POST.
    expect(request).toHaveBeenCalledOnce();
  });

  it('falls back to POST when the existing comment was deleted (PATCH 404)', async () => {
    request
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ data: { id: 200, html_url: 'https://gh/c/200' } });
    const res = await upsertPRComment({ ...base, existingCommentId: 100 });
    expect(res.commentId).toBe(200);
    expect(request.mock.calls[0][0]).toContain('PATCH');
    expect(request.mock.calls[1][0]).toContain('POST');
  });
});
