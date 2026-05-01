import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

/**
 * Reads the GitHub App private key from env.
 * Supports two formats:
 *  1. Base64-encoded PEM (recommended — survives Vercel/env-var transport cleanly)
 *  2. Raw PEM with literal newlines
 */
function loadPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) {
    throw new Error('GITHUB_APP_PRIVATE_KEY is not set');
  }

  // If it already looks like a PEM, return as-is.
  if (raw.includes('-----BEGIN')) {
    return raw;
  }

  // Otherwise, treat it as base64 and decode.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    if (!decoded.includes('-----BEGIN')) {
      throw new Error('Decoded key does not look like a PEM');
    }
    return decoded;
  } catch (err: any) {
    throw new Error(`Failed to decode GITHUB_APP_PRIVATE_KEY: ${err.message}`);
  }
}

export function getInstallationOctokit(installationId: number): Octokit {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = loadPrivateKey();

  if (!appId) {
    throw new Error('GITHUB_APP_ID must be set');
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
}

export function getAppOctokit(): Octokit {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = loadPrivateKey();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey },
  });
}