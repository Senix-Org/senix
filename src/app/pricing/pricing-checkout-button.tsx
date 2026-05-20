'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';

type PlanName = 'free' | 'starter' | 'team' | 'pro';

type Props = {
  plan: PlanName;
  label: string;
  highlight?: boolean;
};

export function PricingCheckoutButton({
  plan,
  label,
  highlight = false,
}: Props): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan === 'free') {
    return (
      <Link
        href="/login"
        className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-md bg-green-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-green-400"
      >
        {label}
        <ArrowRight size={15} />
      </Link>
    );
  }

  async function startCheckout(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (response.status === 401) {
        window.location.assign('/login?next=/pricing');
        return;
      }

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? 'Checkout could not be started.');
      }

      window.location.assign(payload.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
          highlight
            ? 'bg-green-500 text-zinc-950 hover:bg-green-400'
            : 'border border-zinc-700 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/40'
        }`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        {label}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
