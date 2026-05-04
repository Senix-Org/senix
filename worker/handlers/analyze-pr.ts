import { supabaseAdmin } from '../../src/lib/supabase';
   import { fetchPRFiles, fetchFileContent } from '../../src/server/github-diff';
   import { diffFile, FileStructuralDiff } from '../../src/lib/structural-diff';
   import { detectLanguage } from '../../src/lib/parser';
   import type { JobPayloadMap } from '../../src/lib/queue';
   
   const MAX_FILES_FOR_STRUCTURAL_DIFF = 50;
   
   export async function processAnalyzePr(
     payload: JobPayloadMap['analyze-pr']
   ): Promise<void> {
     const { analysisId, installationId, owner, repo, prNumber, headSha, baseSha } = payload;
   
     // Mark as running
     await supabaseAdmin
       .from('analyses')
       .update({ status: 'running' })
       .eq('id', analysisId);
   
     try {
       const files = await fetchPRFiles(installationId, owner, repo, prNumber);
       const supportedFiles = files.filter((f) => detectLanguage(f.filename) !== null);
   
       const structural: FileStructuralDiff[] = [];
   
       if (supportedFiles.length <= MAX_FILES_FOR_STRUCTURAL_DIFF) {
         for (const file of supportedFiles) {
           const isAdded = file.status === 'added';
           const isRemoved = file.status === 'removed';
   
           const beforeContent = isAdded
             ? null
             : await fetchFileContent(
                 installationId,
                 owner,
                 repo,
                 file.previous_filename ?? file.filename,
                 baseSha
               );
           const afterContent = isRemoved
             ? null
             : await fetchFileContent(
                 installationId,
                 owner,
                 repo,
                 file.filename,
                 headSha
               );
   
           structural.push(diffFile(file.filename, beforeContent, afterContent));
         }
       }
   
       const totalAdditions = files.reduce((s, f) => s + (f.additions || 0), 0);
       const totalDeletions = files.reduce((s, f) => s + (f.deletions || 0), 0);
       const symbolChangeCount = structural.reduce(
         (s, f) => s + f.summary.added + f.summary.modified + f.summary.removed,
         0
       );
   
       await supabaseAdmin
         .from('analyses')
         .update({
           status: 'completed',
           completed_at: new Date().toISOString(),
           risk_flags: {
             file_count: files.length,
             supported_file_count: supportedFiles.length,
             additions: totalAdditions,
             deletions: totalDeletions,
             symbol_changes: symbolChangeCount,
             structural_diff: structural,
             sample_files: files.slice(0, 5).map((f) => f.filename),
           },
         })
         .eq('id', analysisId);
     } catch (err: any) {
       await supabaseAdmin
         .from('analyses')
         .update({
           status: 'failed',
           completed_at: new Date().toISOString(),
           error_message: err?.message ?? String(err),
         })
         .eq('id', analysisId);
       throw err; // bubble up so the queue retries
     }
   }