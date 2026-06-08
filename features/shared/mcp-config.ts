/**
 * Single source of truth for MCP client configuration.
 *
 * The Connect IDE flow and the public docs both build their snippets from
 * here, so the two can never drift apart again. Every per-IDE shape is the
 * canonical one that the respective tool actually accepts:
 *   - Cursor:       "transport": "http"
 *   - Claude Code:  "type": "http"  (and the `claude mcp add` CLI)
 *   - Windsurf:     "serverUrl"
 *
 * The server URL is read from NEXT_PUBLIC_APP_URL so local and self-hosted
 * deployments work without code changes, falling back to the hosted app.
 */

const FALLBACK_BASE_URL = 'https://senix-chi.vercel.app';
const TOKEN_PLACEHOLDER = 'YOUR_TOKEN_HERE';

/** Base app URL with any trailing slash stripped. */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (raw && raw.replace(/\/+$/, '')) || FALLBACK_BASE_URL;
}

/** Full MCP endpoint, e.g. https://senix-chi.vercel.app/api/mcp */
export function getMcpServerUrl(): string {
  return `${getAppBaseUrl()}/api/mcp`;
}

function bearer(token: string | null): string {
  return `Bearer ${token ?? TOKEN_PLACEHOLDER}`;
}

/** Cursor — HTTP transport via `transport: "http"`. */
export function cursorConfigJson(token: string | null, url: string = getMcpServerUrl()): string {
  return JSON.stringify(
    { mcpServers: { senix: { transport: 'http', url, headers: { Authorization: bearer(token) } } } },
    null,
    2
  );
}

/** Claude Code — HTTP transport via `type: "http"`. */
export function claudeCodeConfigJson(token: string | null, url: string = getMcpServerUrl()): string {
  return JSON.stringify(
    { mcpServers: { senix: { type: 'http', url, headers: { Authorization: bearer(token) } } } },
    null,
    2
  );
}

/** Windsurf — uses `serverUrl`. */
export function windsurfConfigJson(token: string | null, url: string = getMcpServerUrl()): string {
  return JSON.stringify(
    { mcpServers: { senix: { serverUrl: url, headers: { Authorization: bearer(token) } } } },
    null,
    2
  );
}

/** Generic url+headers shape (used for Antigravity and other MCP clients). */
export function genericConfigJson(token: string | null, url: string = getMcpServerUrl()): string {
  return JSON.stringify(
    { mcpServers: { senix: { url, headers: { Authorization: bearer(token) } } } },
    null,
    2
  );
}

/** One-line `claude mcp add` command, displayed multi-line for readability. */
export function claudeCodeCliCommand(token: string | null, url: string = getMcpServerUrl()): string {
  return `claude mcp add senix --transport http \\\n  --url ${url} \\\n  --header "Authorization: Bearer ${token ?? TOKEN_PLACEHOLDER}"`;
}

function toBase64(input: string): string {
  if (typeof btoa !== 'undefined') {
    // Browser: handle any non-ASCII safely.
    return btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf8').toString('base64');
}

/**
 * Cursor one-click install deep link. Opens Cursor and installs the Senix
 * MCP server with the token already embedded. The `config` param is the
 * base64-encoded single-server config object Cursor expects.
 */
export function cursorDeepLink(token: string | null, url: string = getMcpServerUrl()): string {
  const serverConfig = JSON.stringify({ url, headers: { Authorization: bearer(token) } });
  const encoded = encodeURIComponent(toBase64(serverConfig));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=senix&config=${encoded}`;
}
