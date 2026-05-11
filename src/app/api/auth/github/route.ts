import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = req.nextUrl;
  const next = safeNextPath(searchParams.get('next'));
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', next);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    const home = new URL('/', origin);
    home.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(home);
  }

  return NextResponse.redirect(data.url);
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}
