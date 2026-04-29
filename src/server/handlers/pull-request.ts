import { supabaseAdmin } from '@/lib/supabase';
   import { findRepository } from './lookup';
   import { fetchPRFiles } from '../github-diff';
   
   /**
    * Handles pull_request events.
    * Relevant actions for now: opened, synchronize (new commits pushed), reopened.
    * We ignore: closed, edited, labeled, etc. — we'll add them later if useful.
    */
   const ACTIONS_WE_HANDLE = new Set(['opened', 'synchronize', 'reopened']);
   
   export async function handlePullRequest(payload: any): Promise<string> {
     const action = payload.action as string;
     if (!ACTIONS_WE_HANDLE.has(action)) {
       return `pull_request:skipped:${action}`;
     }
   
     const pr = payload.pull_request;
     const repoPayload = payload.repository;
     const installationId = payload.installation?.id as number;
   
     if (!pr || !repoPayload || !installationId) {
       return 'pull_request:missing-fields';
     }
   
     // Find our internal repo record
     const repo = await findRepository(repoPayload.id);
     if (!repo) {
       return `pull_request:unknown-repo:${repoPayload.id}`;
     }
     if (!repo.enabled) {
       return `pull_request:repo-disabled:${repo.full_name}`;
     }
   
     // Upsert the PR record
     const { data: prRow, error: prError } = await supabaseAdmin
       .from('pull_requests')
       .upsert(
         {
           repository_id: repo.id,
           github_pr_number: pr.number,
           github_pr_id: pr.id,
           title: pr.title,
           author_login: pr.user?.login ?? null,
           state: pr.state,
           head_sha: pr.head.sha,
           base_sha: pr.base.sha,
           updated_at: new Date().toISOString(),
         },
         { onConflict: 'github_pr_id' }
       )
       .select()
       .single();
   
     if (prError || !prRow) {
       throw new Error(`Failed to upsert PR: ${prError?.message}`);
     }
   
     // Fetch the diff (list of changed files)
     const [owner, repoName] = repo.full_name.split('/');
     const files = await fetchPRFiles(installationId, owner, repoName, pr.number);
   
     // Create an analysis row in 'queued' state.
     // We'll process it in Day 5+. For now, just log file counts in error_message
     // so we can see it in the UI for free.
     const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
     const totalDeletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);
   
     const { error: analysisError } = await supabaseAdmin
       .from('analyses')
       .insert({
         pull_request_id: prRow.id,
         commit_sha: pr.head.sha,
         status: 'queued',
         risk_flags: {
           file_count: files.length,
           additions: totalAdditions,
           deletions: totalDeletions,
           sample_files: files.slice(0, 5).map((f) => f.filename),
         },
       });
   
     if (analysisError) {
       throw new Error(`Failed to create analysis: ${analysisError.message}`);
     }
   
     return `pull_request:${action}:${repo.full_name}#${pr.number}:files=${files.length}`;
   }