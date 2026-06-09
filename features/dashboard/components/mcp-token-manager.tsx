'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { formatRelativeTime } from '@features/shared/relative-time';
import { generateMcpToken, revokeMcpToken } from '@/app/dashboard/tokens/actions';
import { TokenReveal } from '@features/dashboard/components/token-reveal';

export type McpTokenView = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

/**
 * Format the created timestamp as an absolute date, e.g. "Nov 15, 2026".
 * A fixed locale keeps the server and client render identical so the
 * date does not trip React's hydration check.
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Interactive MCP token list. Renders existing tokens as cards with a
 * quiet revoke action and a "Generate token" modal. The plaintext token
 * is shown exactly once, immediately after generation.
 */
export function McpTokenManager({
  tokens,
}: {
  tokens: McpTokenView[];
}): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      {tokens.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="max-w-xs text-sm text-secondary">
            No tokens yet. Generate one to connect your IDE.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-surface-raised px-3 py-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-surface-border"
          >
            <Plus size={15} strokeWidth={2.25} />
            Generate token
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-surface-raised px-3 py-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-surface-border"
            >
              <Plus size={15} strokeWidth={2.25} />
              Generate token
            </button>
          </div>
          <div className="space-y-3">
            {tokens.map((token) => (
              <TokenRow key={token.id} token={token} />
            ))}
          </div>
        </>
      )}

      {modalOpen && <GenerateModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function TokenRow({ token }: { token: McpTokenView }): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revoked = Boolean(token.revokedAt);

  const lastUsed = token.lastUsedAt
    ? formatRelativeTime(new Date(token.lastUsedAt))
    : 'never';

  async function onRevoke(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await revokeMcpToken(token.id);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-primary">{token.name}</span>
          {revoked && (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              Revoked
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
          <span suppressHydrationWarning>Created {formatDate(token.createdAt)}</span>
          <span className="text-muted">·</span>
          <span suppressHydrationWarning title={token.lastUsedAt ?? undefined}>
            Last used {lastUsed}
          </span>
        </div>
        {error && <div className="mt-1 text-xs text-risk-high">{error}</div>}
      </div>
      {!revoked && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="shrink-0 text-xs text-muted transition-colors duration-150 hover:text-risk-high disabled:opacity-50"
        >
          {busy ? 'Revoking' : 'Revoke'}
        </button>
      )}
    </div>
  );
}

function GenerateModal({ onClose }: { onClose: () => void }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    if (token) router.refresh();
    onClose();
  }, [busy, token, router, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [close]);

  async function onGenerate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await generateMcpToken(name.trim());
    if (result.ok) {
      setToken(result.token);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-token-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-xl border border-surface-border bg-surface shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="mcp-token-heading" className="text-lg font-semibold text-primary">
            {token ? 'Token generated' : 'Generate MCP token'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded p-1 text-secondary transition-colors hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {token ? (
          <div className="p-6 pt-4">
            <TokenReveal token={token} />
            {error && <p className="mt-3 text-xs text-risk-high">{error}</p>}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-neutral-border bg-surface-raised px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-border"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onGenerate} className="p-6 pt-4">
            <p className="text-sm text-secondary">
              Give the token a name so you can recognize it later.
            </p>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-wider text-muted">Token name</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                placeholder="Cursor on my laptop"
                className="mt-1.5 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none"
              />
            </label>
            {error && (
              <div className="mt-4 rounded-lg border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
                {error}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-sm text-secondary transition-colors hover:text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || name.trim().length < 2}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Generating' : 'Generate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
