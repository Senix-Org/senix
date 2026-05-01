import { supabaseAdmin } from '@/lib/supabase';
   
   export const dynamic = 'force-dynamic';
   export const revalidate = 0;
   
   export default async function InternalPage() {
     const [{ data: events }, { data: prs }, { data: analyses }, { count: installCount }] =
       await Promise.all([
         supabaseAdmin
           .from('webhook_events')
           .select('event_type, action, signature_valid, processed, received_at')
           .order('received_at', { ascending: false })
           .limit(20),
         supabaseAdmin
           .from('pull_requests')
           .select('id, github_pr_number, title, state, head_sha, updated_at, repository_id, repositories(full_name)')
           .order('updated_at', { ascending: false })
           .limit(10),
         supabaseAdmin
           .from('analyses')
           .select('id, status, commit_sha, risk_flags, created_at, pull_request_id')
           .order('created_at', { ascending: false })
           .limit(10),
         supabaseAdmin.from('installations').select('*', { count: 'exact', head: true }),
       ]);
   
     return (
       <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-sm">
         <h1 className="text-2xl font-bold mb-2">Internal Status</h1>
         <p className="text-zinc-500 mb-8">Installs: {installCount ?? 0}</p>
   
         <section className="mb-10">
           <h2 className="text-lg font-bold mb-3">Last 20 webhook events</h2>
           <div className="space-y-1">
             {(events ?? []).map((e, i) => (
               <div key={i} className="flex gap-4 text-zinc-300">
                 <span className="text-zinc-500 w-44">{new Date(e.received_at).toLocaleString()}</span>
                 <span className="w-32">{e.event_type}</span>
                 <span className="w-28 text-zinc-400">{e.action ?? '-'}</span>
                 <span className={e.signature_valid ? 'text-green-400' : 'text-red-400'}>
                   {e.signature_valid ? 'sig:ok' : 'sig:bad'}
                 </span>
                 <span className={e.processed ? 'text-green-400' : 'text-yellow-400'}>
                   {e.processed ? 'done' : 'pending'}
                 </span>
               </div>
             ))}
           </div>
         </section>
   
         <section className="mb-10">
           <h2 className="text-lg font-bold mb-3">Recent pull requests</h2>
           <div className="space-y-1">
             {(prs ?? []).map((p: any) => (
               <div key={p.id} className="flex gap-4 text-zinc-300">
                 <span className="w-56 truncate">{p.repositories?.full_name}</span>
                 <span className="w-12">#{p.github_pr_number}</span>
                 <span className="w-20">{p.state}</span>
                 <span className="w-20 text-zinc-500">{p.head_sha?.slice(0, 7)}</span>
                 <span className="truncate">{p.title}</span>
               </div>
             ))}
           </div>
         </section>
   
         <section>
           <h2 className="text-lg font-bold mb-3">Recent analyses</h2>
           <div className="space-y-1">
             {(analyses ?? []).map((a: any) => (
               <div key={a.id} className="flex gap-4 text-zinc-300">
                 <span className="text-zinc-500 w-44">{new Date(a.created_at).toLocaleString()}</span>
                 <span className="w-20">{a.status}</span>
                 <span className="w-20 text-zinc-500">{a.commit_sha?.slice(0, 7)}</span>
                 <span className="text-zinc-400">
                   files={a.risk_flags?.file_count ?? '?'} +{a.risk_flags?.additions ?? 0}/-{a.risk_flags?.deletions ?? 0}
                 </span>
               </div>
             ))}
           </div>
         </section>
   
         <p className="text-zinc-600 mt-12">⚠️ This page is unauthenticated. Add password protection before sharing the URL.</p>
       </main>
     );
   }