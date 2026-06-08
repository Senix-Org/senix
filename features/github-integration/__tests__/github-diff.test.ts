import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the diff fetcher returns the correct list of changed files for a
 * PR, and that file-content fetch decodes base64 and returns null for a
 * missing file (added/deleted at that SHA).
 * Failure means: the analyzer would see the wrong files or crash on a
 * legitimately absent file.
 */

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@features/github-integration/github-app', () => ({
  getInstallationOctokit: () => ({ request }),
}));

import { fetchPRFiles, fetchFileContent } from '@features/github-integration/github-diff';

beforeEach(() => request.mockReset());

describe('fetchPRFiles', () => {
  it('returns the changed files from a single page', async () => {
    request.mockResolvedValue({
      data: [
        { filename: 'a.ts', status: 'modified', additions: 3, deletions: 1, changes: 4 },
        { filename: 'b.ts', status: 'added', additions: 10, deletions: 0, changes: 10 },
      ],
    });
    const files = await fetchPRFiles(1, 'o', 'r', 5);
    expect(files.map((f) => f.filename)).toEqual(['a.ts', 'b.ts']);
  });

  it('paginates until a short page is returned', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({
      filename: `f${i}.ts`, status: 'modified', additions: 1, deletions: 0, changes: 1,
    }));
    request.mockResolvedValueOnce({ data: full }).mockResolvedValueOnce({ data: [{ filename: 'last.ts', status: 'modified', additions: 1, deletions: 0, changes: 1 }] });
    const files = await fetchPRFiles(1, 'o', 'r', 5);
    expect(files).toHaveLength(101);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('fetchFileContent', () => {
  it('decodes base64 file content', async () => {
    request.mockResolvedValue({
      data: { type: 'file', content: Buffer.from('hello world').toString('base64') },
    });
    expect(await fetchFileContent(1, 'o', 'r', 'a.ts', 'sha')).toBe('hello world');
  });

  it('returns null when the file does not exist at that SHA (404)', async () => {
    request.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('Not Found'), { status: 404 }))
    );
    expect(await fetchFileContent(1, 'o', 'r', 'gone.ts', 'sha')).toBeNull();
  });

  it('returns null for a directory response (not a file)', async () => {
    request.mockResolvedValue({ data: [{ type: 'file' }] });
    expect(await fetchFileContent(1, 'o', 'r', 'dir', 'sha')).toBeNull();
  });
});
