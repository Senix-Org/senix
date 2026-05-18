'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  RotateCw,
  TriangleAlert,
} from 'lucide-react';

/**
 * Interactive "Connect your IDE" flow.
 *
 * Starts on a 2x2 grid of supported IDEs. Selecting one swaps to a
 * three-step setup view (generate a token, copy the config, restart),
 * all driven by client state with no route change. A generated token is
 * held in state so it can be substituted into the config snippet and so
 * switching IDEs keeps the same token. The token is shown exactly once:
 * once the user leaves the page the state is gone and it cannot be
 * recovered, only revoked from the dashboard.
 */

const SERVER_URL = 'https://senix-chi.vercel.app/api/mcp';
const MAX_NAME_LEN = 60;

type IdeKey = 'cursor' | 'antigravity' | 'claude-code' | 'windsurf';

type Ide = {
  key: IdeKey;
  name: string;
  badge: string;
  /** Where the MCP config file lives for this IDE. */
  location: string;
  /** Optional docs link, used when the file location varies by platform. */
  docsUrl?: string;
};

// Grid order matches the task: Cursor, Antigravity, Claude Code, Windsurf.
const IDES: Ide[] = [
  {
    key: 'cursor',
    name: 'Cursor',
    badge: 'Cu',
    location: '~/.cursor/mcp.json on macOS or Linux, %APPDATA%\\Cursor\\mcp.json on Windows',
  },
  {
    key: 'antigravity',
    name: 'Antigravity',
    badge: 'Ag',
    location: 'The MCP config file location varies by platform. See the Antigravity docs.',
    docsUrl: 'https://antigravity.google',
  },
  {
    key: 'claude-code',
    name: 'Claude Code',
    badge: 'CC',
    location: '~/.config/claude/mcp_servers.json',
  },
  {
    key: 'windsurf',
    name: 'Windsurf',
    badge: 'Ws',
    location: '~/.codeium/windsurf/mcp_config.json',
  },
];

/** Build the config snippet, substituting the token (or a placeholder). */
function buildConfig(token: string | null): string {
  return `{
  "mcpServers": {
    "senix": {
      "url": "${SERVER_URL}",
      "headers": {
        "Authorization": "Bearer ${token ?? 'YOUR_TOKEN_HERE'}"
      }
    }
  }
}`;
}

export function ConnectIde(): React.ReactElement {
  const [selected, setSelected] = useState<Ide | null>(null);
  const [token, setToken] = useState<string | null>(null);

  if (selected) {
    return (
      <SetupView
        key={selected.key}
        ide={selected}
        token={token}
        onToken={setToken}
        onBack={() => setSelected(null)}
      />
    );
  }

  return <IdeGrid onSelect={setSelected} />;
}

function IdeGrid({ onSelect }: { onSelect: (ide: Ide) => void }): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {IDES.map((ide) => (
        <button
          key={ide.key}
          type="button"
          onClick={() => onSelect(ide)}
          className="group flex cursor-pointer items-center gap-4 rounded-xl border border-surface-border bg-surface p-6 text-left transition-all duration-150 hover:border-neutral-border hover:bg-surface-raised"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised font-mono text-sm font-bold text-primary">
            {ide.badge}
          </span>
          <span className="flex-1 truncate text-base font-medium text-primary">{ide.name}</span>
          <span className="shrink-0 rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-primary transition-colors duration-150 group-hover:border-[#444444]">
            Select
          </span>
        </button>
      ))}
    </div>
  );
}

function SetupView({
  ide,
  token,
  onToken,
  onBack,
}: {
  ide: Ide;
  token: string | null;
  onToken: (token: string) => void;
  onBack: () => void;
}): React.ReactElement {
  return (
    <div className="animate-fade-up space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-secondary transition-colors duration-150 hover:text-primary"
        >
          <ChevronLeft size={15} />
          Choose a different IDE
        </button>
        <span className="text-muted">/</span>
        <span className="text-primary">{ide.name}</span>
      </div>

      <TokenStep token={token} onToken={onToken} />
      <ConfigStep ide={ide} token={token} />
      <RestartStep />

      <a
        href="/docs/troubleshooting"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors duration-150 hover:text-primary"
      >
        Need help?
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

/** Outlined step circle. Switches to an accent check once completed. */
function StepCircle({ step, done }: { step: number; done: boolean }): React.ReactElement {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-sm transition-colors duration-300 ease-out ${
        done ? 'border-accent text-accent' : 'border-surface-border text-secondary'
      }`}
    >
      {done ? <Check size={15} strokeWidth={2.5} /> : step}
    </span>
  );
}

function StepBox({
  step,
  title,
  done = false,
  children,
}: {
  step: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-xl border border-surface-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <StepCircle step={step} done={done} />
        <h2 className="text-base font-semibold text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TokenStep({
  token,
  onToken,
}: {
  token: string | null;
  onToken: (token: string) => void;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/mcp/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? 'Could not generate a token. Try again.');
        return;
      }
      onToken(data.token);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepBox step={1} title="Name and generate your token" done={Boolean(token)}>
      {token ? (
        <div>
          <div className="flex items-start gap-2 rounded-lg border border-risk-medium/30 bg-risk-medium/10 px-3 py-2.5 text-xs text-risk-medium">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              This is the only time this token is shown. Copy it now. If you lose it, generate a
              new one.
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs uppercase tracking-wider text-muted">Your token</span>
            <CopyField className="mt-1.5" value={token} />
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-secondary">
            Give the token a name so you can recognize it later. Leave it blank to use a default
            name.
          </p>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-wider text-muted">Token name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LEN))}
              placeholder="My Cursor setup"
              className="mt-1.5 w-full rounded-lg border border-surface-border bg-surface-raised p-3 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none"
            />
          </label>
          {error && (
            <div className="mt-3 rounded-lg border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="mt-4 inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Generating' : 'Generate token'}
          </button>
        </div>
      )}
    </StepBox>
  );
}

function ConfigStep({ ide, token }: { ide: Ide; token: string | null }): React.ReactElement {
  const config = buildConfig(token);

  return (
    <StepBox step={2} title="Copy your config">
      {!token && (
        <p className="mb-3 text-sm leading-relaxed text-secondary">
          Generate a token in step 1 first. It will be filled into the snippet below.
        </p>
      )}
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-surface-raised p-4 pr-12 font-mono text-xs leading-relaxed text-secondary">
          {config}
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton value={config} iconOnly />
        </div>
      </div>
      <p className="mt-3 font-mono text-xs text-muted">{ide.location}</p>
      {ide.docsUrl && (
        <a
          href={ide.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-secondary transition-colors duration-150 hover:text-primary"
        >
          Open the Antigravity docs
          <ArrowRight size={12} />
        </a>
      )}
    </StepBox>
  );
}

function RestartStep(): React.ReactElement {
  return (
    <StepBox step={3} title="Restart your IDE and test">
      <div className="space-y-3 text-sm leading-relaxed text-secondary">
        <p className="flex items-start gap-2">
          <RotateCw size={15} className="mt-0.5 shrink-0 text-muted" />
          Quit your IDE completely and reopen it. Some IDEs only load MCP servers on a full
          restart.
        </p>
        <p>
          Then type this in the chat panel:{' '}
          <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-primary">
            Use Senix to review my changes.
          </span>
        </p>
        <p className="text-muted">If Senix runs and returns a review, you are connected.</p>
      </div>
    </StepBox>
  );
}

/** A read-only value field with a copy button beside it. */
function CopyField({ value, className }: { value: string; className?: string }): React.ReactElement {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <input
        type="text"
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-raised p-3 font-mono text-sm text-primary"
      />
      <CopyButton value={value} />
    </div>
  );
}

/** Stateless copy-to-clipboard button with a transient "Copied" state. */
function CopyButton({
  value,
  iconOnly = false,
}: {
  value: string;
  iconOnly?: boolean;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the field is selectable as a fallback.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy'}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-secondary transition-colors duration-150 hover:text-primary"
    >
      <span className="relative inline-block h-[15px] w-[15px]">
        <Copy
          size={15}
          className={`absolute inset-0 transition-opacity duration-150 ${
            copied ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <Check
          size={15}
          className={`absolute inset-0 text-accent transition-opacity duration-150 ${
            copied ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </span>
      {!iconOnly && <span>{copied ? 'Copied' : 'Copy'}</span>}
    </button>
  );
}
