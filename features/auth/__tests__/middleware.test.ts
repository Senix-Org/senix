import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enforceInternalBasicAuth } from '@/middleware';

/**
 * Proves the SECURITY FIX from the audit: /internal/* fails CLOSED.
 * When INTERNAL_PASSWORD is unset, every request is denied (401) instead
 * of being silently allowed. With a password set, only correct Basic Auth
 * credentials pass.
 * Failure means: a missing env var would expose internal tooling publicly.
 */

function reqWithAuth(headerValue?: string) {
  const headers = new Headers();
  if (headerValue) headers.set('authorization', headerValue);
  // enforceInternalBasicAuth only reads req.headers.get('authorization').
  return { headers } as unknown as Parameters<typeof enforceInternalBasicAuth>[0];
}

function basic(password: string, user = 'admin') {
  return 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
}

const original = process.env.INTERNAL_PASSWORD;
beforeEach(() => {
  delete process.env.INTERNAL_PASSWORD;
});
afterEach(() => {
  if (original === undefined) delete process.env.INTERNAL_PASSWORD;
  else process.env.INTERNAL_PASSWORD = original;
});

describe('enforceInternalBasicAuth (fail closed)', () => {
  it('DENIES with 401 when INTERNAL_PASSWORD is unset', () => {
    const res = enforceInternalBasicAuth(reqWithAuth(basic('anything')));
    expect(res.status).toBe(401);
  });

  it('denies with 401 when credentials are wrong', () => {
    process.env.INTERNAL_PASSWORD = 'correct';
    const res = enforceInternalBasicAuth(reqWithAuth(basic('wrong')));
    expect(res.status).toBe(401);
  });

  it('denies with 401 when no authorization header is provided', () => {
    process.env.INTERNAL_PASSWORD = 'correct';
    const res = enforceInternalBasicAuth(reqWithAuth());
    expect(res.status).toBe(401);
  });

  it('allows the request when credentials are correct', () => {
    process.env.INTERNAL_PASSWORD = 'correct';
    const res = enforceInternalBasicAuth(reqWithAuth(basic('correct')));
    expect(res.status).toBe(200);
  });
});
