import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createWhopCheckoutLink, whopProductIdForPlan } from '@/lib/whop';
import type { PaidPlanName } from '@/lib/whop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAID_PLANS = new Set<PaidPlanName>(['starter', 'team', 'pro']);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const plan =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).plan === 'string'
      ? ((body as Record<string, unknown>).plan as string).toLowerCase()
      : '';

  if (plan === 'free') {
    return NextResponse.json({ error: 'Free plan does not need checkout.' }, { status: 400 });
  }
  if (!PAID_PLANS.has(plan as PaidPlanName)) {
    return NextResponse.json({ error: 'Unknown billing plan.' }, { status: 400 });
  }

  const productId = whopProductIdForPlan(plan as PaidPlanName);
  if (!productId) {
    return NextResponse.json({ error: 'Whop product is not configured.' }, { status: 500 });
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const checkoutUrl = await createWhopCheckoutLink({
      plan: plan as PaidPlanName,
      productId,
      redirectUrl: `${origin}/dashboard/billing`,
      prefillEmail: authData.user.email ?? null,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('configured') ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
