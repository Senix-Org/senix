import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the Octokit client is authenticated and scoped to the specific
 * installation id passed in, using the GitHub App credentials.
 * Failure means: a review could run against the wrong installation's token,
 * a cross-tenant access bug.
 */

const { OctokitMock, createAppAuthMock } = vi.hoisted(() => ({
  OctokitMock: vi.fn(),
  createAppAuthMock: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({ Octokit: OctokitMock }));
vi.mock('@octokit/auth-app', () => ({ createAppAuth: createAppAuthMock }));

import { getInstallationOctokit } from '@features/github-integration/github-app';

beforeEach(() => {
  OctokitMock.mockReset();
  process.env.GITHUB_APP_ID = '12345';
  process.env.GITHUB_APP_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----';
});

describe('getInstallationOctokit', () => {
  it('scopes the client to the given installation id', () => {
    getInstallationOctokit(987);
    expect(OctokitMock).toHaveBeenCalledOnce();
    const opts = OctokitMock.mock.calls[0][0];
    expect(opts.auth.installationId).toBe(987);
    expect(opts.auth.appId).toBe('12345');
    expect(opts.authStrategy).toBe(createAppAuthMock);
  });

  it('passes a different installation id through unchanged', () => {
    getInstallationOctokit(111);
    expect(OctokitMock.mock.calls[0][0].auth.installationId).toBe(111);
  });
});
