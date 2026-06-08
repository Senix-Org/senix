import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyGithubSignature } from '@features/webhook/signature';

/**
 * Proves: a webhook signed with the shared secret is accepted, and any
 * tampered, mismatched, or missing signature is rejected.
 * Failure means: forged webhooks could trigger analyses, or legitimate
 * GitHub deliveries could be silently dropped.
 */
const SECRET = 'test-webhook-secret';

function sign(body: string, secret = SECRET): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyGithubSignature', () => {
  it('accepts a signature produced with the correct secret', () => {
    const body = JSON.stringify({ action: 'opened' });
    expect(verifyGithubSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a signature produced with the wrong secret', () => {
    const body = JSON.stringify({ action: 'opened' });
    expect(verifyGithubSignature(body, sign(body, 'wrong-secret'), SECRET)).toBe(false);
  });

  it('rejects when the body was tampered after signing', () => {
    const sig = sign(JSON.stringify({ action: 'opened' }));
    const tampered = JSON.stringify({ action: 'closed' });
    expect(verifyGithubSignature(tampered, sig, SECRET)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyGithubSignature('{}', null, SECRET)).toBe(false);
  });

  it('rejects a malformed signature of a different length without throwing', () => {
    expect(verifyGithubSignature('{}', 'sha256=deadbeef', SECRET)).toBe(false);
  });
});
