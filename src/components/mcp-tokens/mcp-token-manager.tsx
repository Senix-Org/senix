'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, KeyRound, Plus, TriangleAlert, X } from 'lucide-react';
import { generateMcpToken, revokeMcpToken } from '@/app/dashboard/mcp-tokens/actions';

export type McpTokenView = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

const MASKED = 'sk_mcp_••••••••••••••••';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Interactive MCP token list. Renders existing tokens with a revoke
 * action and a "Generate new token" modal. The plaintext token is shown
 * exactly once, immediately after generation.
 */
export function McpTokenManager({
  tokens,
}: {
  tokens: McpTokenView[];
}): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Your tokens</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-500 hover:bg-green-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Generate new token
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400 leading-relaxed">
          No tokens yet. Generate one to connect Senix to your IDE.
        </div>
      ) : (
        <ul className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800 overflow-hidden">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))}
        </ul>
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
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <KeyRound size={16} strokeWidth={1.5} className="mt-1 text-zinc-500 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-100 font-medium truncate">{token.name}</span>
            {revoked && (
              <span className="text-[10px] font-medium uppercase tracking-wider rounded-full bg-zinc-800 text-zinc-400 px-2 py-0.5">
                Revoked
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-xs text-zinc-500">{MASKED}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Created {formatDate(token.createdAt)} · Last used {formatDate(token.lastUsedAt)}
          </div>
          {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
        </div>
      </div>
      {!revoked && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="shrink-0 rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-red-900/60 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Revoking…' : 'Revoke'}
        </button>
      )}
    </li>
  );
}

function GenerateModal({ onClose }: { onClose: () => void }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  async function onCopy(): Promise<void> {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select the token and copy manually.');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-token-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <h2 id="mcp-token-heading" className="text-lg font-semibold text-zinc-100">
            {token ? 'Token generated' : 'Generate MCP token'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {token ? (
          <div className="p-6 pt-4">
            <div className="flex items-start gap-2 rounded-md border border-amber-900/40 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-200">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              <span>This is the only time you&apos;ll see this token. Copy it now.</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-green-400">
                {token}
              </code>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 shrink-0 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-md bg-green-500 hover:bg-green-400 px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onGenerate} className="p-6 pt-4">
            <p className="text-sm text-zinc-400">
              Give the token a name so you can recognize it later.
            </p>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Token name</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                placeholder="Cursor on my laptop"
                className="mt-1.5 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
              />
            </label>
            {error && (
              <div className="mt-4 rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="px-3 py-1.5 rounded-md text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || name.trim().length < 2}
                className="px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-400 text-zinc-950 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
