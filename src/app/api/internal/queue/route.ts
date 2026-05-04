import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { queueStats } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FailedAnalysisRow = {
  id: string;
  error_message: string | null;
  created_at: string;
  pull_request_id: string | null;
};

type QueueInspectionResponse = {
  queued: number;
  processing: number;
  recentFailed: FailedAnalysisRow[];
};

/**
 * Validate the Basic Auth header against `INTERNAL_PASSWORD`.
 * Mirrors the check in `src/middleware.ts`. The middleware matcher only covers
 * `/internal/:path*`, so API routes under `/api/internal/*` need the check inline.
 */
function isAuthorized(req: NextRequest): boolean {
  const password = process.env.INTERNAL_PASSWORD;
  if (!password) return true; // fail-open in dev if unset, matches middleware behavior
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString();
  const [, providedPassword] = decoded.split(':');
  return providedPassword === password;
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Internal"' },
  });
}

/**
 * GET /api/internal/queue
 *
 * Returns the current Redis queue depth and the 5 most recently failed
 * analyses. Used by the internal dashboard for at-a-glance health.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) return unauthorized();

  const stats = await queueStats();

  const { data: failedRows, error: failedError } = await supabaseAdmin
    .from('analyses')
    .select('id, error_message, created_at, pull_request_id')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (failedError) {
    throw new Error(`Failed to load recent failures: ${failedError.message}`);
  }

  const recentFailed = (failedRows ?? []) as unknown as FailedAnalysisRow[];

  const body: QueueInspectionResponse = {
    queued: stats.queued,
    processing: stats.processing,
    recentFailed,
  };

  return NextResponse.json(body);
}
