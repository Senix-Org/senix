import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { currentAppUserId } from '@/lib/mcp-tokens';
import { PLAN_LIMITS, type PlanName } from '@/lib/plan-limits';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelWhopMembership } from '@/lib/whop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BillingUserRow = {
  id: string;
  plan: PlanName;
  plan_status: string;
  whop_membership_id: string | null;
};

export async function DELETE(): Promise<NextResponse> {
  const userId = await currentAppUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: user, error } = (await supabaseAdmin
    .from('users')
    .select('id, plan, plan_status, whop_membership_id')
    .eq('id', userId)
    .maybeSingle()) as unknown as {
    data: BillingUserRow | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
  if (user.plan === 'free' || !PLAN_LIMITS[user.plan]) {
    return NextResponse.json({ error: 'No paid subscription to cancel.' }, { status: 400 });
  }
  if (!user.whop_membership_id) {
    return NextResponse.json({ error: 'No Whop membership is linked.' }, { status: 400 });
  }

  try {
    await cancelWhopMembership(user.whop_membership_id);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ plan_status: 'cancelled' })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from('plan_events').insert({
      user_id: user.id,
      event_type: 'cancelled',
      from_plan: user.plan,
      to_plan: 'free',
    });

    revalidatePath('/dashboard/billing');
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
