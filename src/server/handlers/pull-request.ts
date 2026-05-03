import { supabaseAdmin } from '@/lib/supabase';
   import { findRepository } from './lookup';
   import { fetchPRFiles, fetchFileContent } from '../github-diff';
   import { diffFile, FileStructuralDiff } from '@/lib/structural-diff';
   import { detectLanguage } from '@/lib/parser';
   
   const ACTIONS_WE_HANDLE = new Set(['opened', 'synchronize', 'reopened']);
   
   // Don't structurally diff massive PRs — bail out and let the LLM stage handle it differently.
   const MAX_FILES_FOR_STRUCTURAL_DIFF = 50;
   
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
   
     const repo = await findRepository(repoPayload.id);
     if (!repo) return `pull_request:unknown-repo:${repoPayload.id}`;
     if (!repo.enabled) return `pull_request:repo-disabled:${repo.full_name}`;
   
     // Upsert PR
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
   
     const [owner, repoName] = repo.full_name.split('/');
     const files = await fetchPRFiles(installationId, owner, repoName, pr.number);
   
     // For each supported file, build a structural diff
     const supportedFiles = files.filter((f) => detectLanguage(f.filename) !== null);
     const structural: FileStructuralDiff[] = [];
   
     if (supportedFiles.length <= MAX_FILES_FOR_STRUCTURAL_DIFF) {
       for (const file of supportedFiles) {
         // Skip removed files for now (no `after` content), but include diff
         const isAdded = file.status === 'added';
         const isRemoved = file.status === 'removed';
   
         const beforeContent = isAdded
           ? null
           : await fetchFileContent(installationId, owner, repoName, file.previous_filename ?? file.filename, pr.base.sha);
         const afterContent = isRemoved
           ? null
           : await fetchFileContent(installationId, owner, repoName, file.filename, pr.head.sha);
   
         structural.push(diffFile(file.filename, beforeContent, afterContent));
       }
     }
   
     // Aggregate counts for the analysis row
     const totalAdditions = files.reduce((sum, f) => sum + (f.additions || 0), 0);
     const totalDeletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0);
     const symbolChangeCount = structural.reduce(
       (sum, f) => sum + f.summary.added + f.summary.modified + f.summary.removed,
       0
     );
   
     const { error: analysisError } = await supabaseAdmin.from('analyses').insert({
       pull_request_id: prRow.id,
       commit_sha: pr.head.sha,
       status: 'queued',
       risk_flags: {
         file_count: files.length,
         supported_file_count: supportedFiles.length,
         additions: totalAdditions,
         deletions: totalDeletions,
         symbol_changes: symbolChangeCount,
         structural_diff: structural,
         sample_files: files.slice(0, 5).map((f) => f.filename),
       },
     });
   
     if (analysisError) {
       throw new Error(`Failed to create analysis: ${analysisError.message}`);
     }
   
     return `pull_request:${action}:${repo.full_name}#${pr.number}:files=${files.length}:symbol_changes=${symbolChangeCount}`;
   }