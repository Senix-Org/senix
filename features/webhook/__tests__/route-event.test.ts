import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Proves: the event router dispatches installation and pull_request events
 * to their handlers, and routes unknown event types to a no-op (ignored)
 * rather than crashing or doing unintended work.
 * Failure means: events could be mis-handled or an unexpected event type
 * could throw and break the webhook response.
 */

const { handleInstallation, handlePullRequest } = vi.hoisted(() => ({
  handleInstallation: vi.fn(),
  handlePullRequest: vi.fn(),
}));

vi.mock('@features/webhook/handlers/installation', () => ({ handleInstallation }));
vi.mock('@features/webhook/handlers/pull-request', () => ({ handlePullRequest }));

import { routeEvent } from '@features/webhook/route-event';

beforeEach(() => {
  handleInstallation.mockReset().mockResolvedValue('installation:ok');
  handlePullRequest.mockReset().mockResolvedValue('pr:ok');
});

describe('routeEvent', () => {
  it('routes installation events to the installation handler', async () => {
    const r = await routeEvent('installation', { action: 'created' });
    expect(handleInstallation).toHaveBeenCalledOnce();
    expect(r).toBe('installation:ok');
  });

  it('routes installation_repositories events to the installation handler', async () => {
    await routeEvent('installation_repositories', { action: 'added' });
    expect(handleInstallation).toHaveBeenCalledOnce();
  });

  it('routes pull_request events to the pull request handler', async () => {
    const r = await routeEvent('pull_request', { action: 'opened' });
    expect(handlePullRequest).toHaveBeenCalledOnce();
    expect(r).toBe('pr:ok');
  });

  it('ignores unsupported event types with a no-op (no handler called)', async () => {
    const r = await routeEvent('star', { action: 'created' });
    expect(handleInstallation).not.toHaveBeenCalled();
    expect(handlePullRequest).not.toHaveBeenCalled();
    expect(r).toBe('ignored:star');
  });
});
