'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RequeueResponse = {
  requeued: number;
  skipped: number;
};

/**
 * Client-side button that POSTs to /api/internal/requeue-failed and shows
 * an inline status message. Calls `router.refresh()` on success so the
 * server-rendered analyses list re-fetches without a full page reload.
 */
export default function RequeueButton(): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick(): Promise<void> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/internal/requeue-failed', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as RequeueResponse;
      setMessage(`Requeued ${data.requeued} jobs (skipped ${data.skipped})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 text-zinc-100"
      >
        {busy ? 'Requeueing…' : 'Requeue all failed in last 24h'}
      </button>
      {message && <div className="mt-2 text-green-400">{message}</div>}
      {error && <div className="mt-2 text-red-400">{error}</div>}
    </div>
  );
}
