import { NextRequest, NextResponse } from 'next/server';
   import { verifyGithubSignature } from '@/lib/github-webhook';
   import { supabaseAdmin } from '@/lib/supabase';
   
   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   
   export async function POST(req: NextRequest) {
     const rawBody = await req.text();
     const signature = req.headers.get('x-hub-signature-256');
     const deliveryId = req.headers.get('x-github-delivery');
     const eventType = req.headers.get('x-github-event');
   
     if (!deliveryId || !eventType) {
       return NextResponse.json(
         { error: 'Missing required GitHub headers' },
         { status: 400 }
       );
     }
   
     const secret = process.env.GITHUB_WEBHOOK_SECRET!;
     const valid = verifyGithubSignature(rawBody, signature, secret);
   
     let payload: any = {};
     try {
       payload = JSON.parse(rawBody);
     } catch {
       payload = { _parseError: true };
     }
   
     // Always log the event, even if signature is bad — helps with debugging.
     const { error } = await supabaseAdmin.from('webhook_events').insert({
       github_delivery_id: deliveryId,
       event_type: eventType,
       action: payload?.action ?? null,
       payload,
       signature_valid: valid,
     });
   
     if (error) {
       console.error('[webhook] failed to log event:', error);
     }
   
     if (!valid) {
       return NextResponse.json(
         { error: 'Invalid signature' },
         { status: 401 }
       );
     }
   
     // For now, we just ack. Day 3+ we'll route events to handlers.
     return NextResponse.json({ ok: true });
   }
   
   // Health check
   export async function GET() {
     return NextResponse.json({ status: 'ready' });
   }