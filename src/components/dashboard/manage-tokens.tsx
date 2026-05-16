'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { deleteMcpToken } from '@/app/dashboard/mcp-token-actions';

/**
 * Dashboard "Manage tokens" list. Shows every MCP token the signed-in
 * user has, with a created date, a relative "last seen" indicator, and a
 * revoke button. Revoking deletes the row and refreshes the page.
 */

export type ManageTokenView = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Format the created timestamp as "Created Nov 15, 2026". */
function formatCreated(iso: string): string {
  const date = new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Created ${date}`;
}

/** Format last-used as relative time, e.g. "Used 2 hours ago". */
function formatLastUsed(iso: string | null): string | null {
  if (!iso) return null;

  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) return 'Used just now';

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `Used ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `Used ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(diff / DAY);
  return `Used ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function ManageTokens({ tokens }: { tokens: ManageTokenView[] }): React.ReactElement {
  if (tokens.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400 leading-relaxed">
        You have no MCP tokens yet.{' '}
        <Link
          href="/dashboard/connect"
          className="text-green-500 hover:text-green-400 underline-offset-2 hover:underline transition-colors"
        >
          Go to Connect your IDE
        </Link>{' '}
        to create one.
      </div>
    );
  }

  return (
    <ul className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800 overflow-hidden">
      {tokens.map((token) => (
        <TokenRow key={token.id} token={token} />
      ))}
    </ul>
  );
}

function TokenRow({ token }: { token: ManageTokenView }): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastUsed = formatLastUsed(token.lastUsedAt);

  async function onRevoke(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await deleteMcpToken(token.id);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <KeyRound size={16} strokeWidth={1.5} className="mt-1 text-zinc-500 shrink-0" />
        <div className="min-w-0">
          <div className="text-zinc-100 font-medium truncate">{token.name}</div>
          <div className="mt-0.5 text-xs text-zinc-500">{formatCreated(token.createdAt)}</div>
          <div className="mt-1 text-xs">
            {lastUsed ? (
              <span className="text-zinc-400">{lastUsed}</span>
            ) : (
              <span className="text-zinc-600">Not yet connected</span>
            )}
          </div>
          {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={busy}
        className="shrink-0 rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-red-900/60 hover:text-red-300 disabled:opacity-50 transition-colors"
      >
        {busy ? 'Revoking…' : 'Revoke'}
      </button>
    </li>
  );
}
