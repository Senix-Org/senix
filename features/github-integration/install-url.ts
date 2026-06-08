/**
 * URL that starts a GitHub App installation.
 *
 * Sending a user here opens GitHub's "install / configure repositories"
 * screen. After they pick repos, GitHub redirects them back to the App's
 * configured Setup URL (`/setup`) with `?installation_id=...`, which is
 * where we link the installation to the signed-in user.
 *
 * The slug is the GitHub App's URL slug (the lowercased, hyphenated app
 * name), configured via NEXT_PUBLIC_GITHUB_APP_SLUG so it works in every
 * environment without code changes. It must be NEXT_PUBLIC_ because the
 * connect buttons are rendered into the client.
 */
export const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? 'senix-bot';

export function getGithubAppInstallUrl(): string {
  return `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
}
