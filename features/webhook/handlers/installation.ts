import { supabaseAdmin } from '@features/shared/supabase';
import { checkRepoLimit, syncReposConnected } from '@features/billing/plan-limits';

type GitHubRepoPayload = {
  id: number;
  full_name: string;
  private?: boolean;
};

type InstallationPayload = {
  action?: string;
  installation?: {
    id?: number;
    account?: {
      login?: string;
      type?: string;
    };
  };
  repositories?: GitHubRepoPayload[];
  repositories_added?: GitHubRepoPayload[];
  repositories_removed?: Array<{ id: number }>;
};
   
   /**
    * Handles installation and installation_repositories events.
    * Possible actions:
    *  - installation.created      → app installed for the first time
    *  - installation.deleted      → app uninstalled
    *  - installation.suspend      → app suspended
    *  - installation.unsuspend    → app un-suspended
    *  - installation_repositories.added   → user added repos to existing install
    *  - installation_repositories.removed → user removed repos
    */
   export async function handleInstallation(payload: InstallationPayload): Promise<string> {
     const action = payload.action ?? '';
     const installation = payload.installation;
     const installationId = installation?.id;
   
     if (!installationId) {
       return 'installation:no-id';
     }
   
     // Handle uninstall
     if (action === 'deleted') {
       const { data: existingInstall } = await supabaseAdmin
         .from('installations')
         .select('installed_by_user_id')
         .eq('github_installation_id', installationId)
         .maybeSingle();

       await supabaseAdmin
         .from('installations')
         .update({ uninstalled_at: new Date().toISOString() })
         .eq('github_installation_id', installationId);

       const userId = (existingInstall as { installed_by_user_id?: string | null } | null)
         ?.installed_by_user_id;
       if (userId) {
         await syncReposConnected(userId);
       }

       return `installation:deleted:${installationId}`;
     }
   
     // Handle suspend / unsuspend
     if (action === 'suspend' || action === 'unsuspend') {
       await supabaseAdmin
         .from('installations')
         .update({ suspended: action === 'suspend' })
         .eq('github_installation_id', installationId);
       return `installation:${action}:${installationId}`;
     }
   
     // Upsert the installation row (created, new_permissions_accepted, etc.).
     // Re-installing the same github_installation_id clears `uninstalled_at`
     // so prior history (repos, PRs, analyses) reactivates instead of being
     // duplicated.
     const account = installation?.account;
     if (!account?.login || !account.type) {
       return `installation:missing-account:${installationId}`;
     }
     const { data: installRow, error: installError } = await supabaseAdmin
       .from('installations')
       .upsert(
         {
           github_installation_id: installationId,
           account_login: account.login,
           account_type: account.type,
           suspended: false,
           uninstalled_at: null,
         },
         { onConflict: 'github_installation_id' }
       )
       .select()
       .single();
   
     if (installError || !installRow) {
       throw new Error(`Failed to upsert installation: ${installError?.message}`);
     }
   
     // For installation events, payload.repositories contains the initial repos
     // For installation_repositories events, use repositories_added / repositories_removed
     const reposAdded =
       payload.repositories ?? payload.repositories_added ?? [];
     const reposRemoved = payload.repositories_removed ?? [];
     const userId = installRow.installed_by_user_id as string | null;
     let blockedByLimit = 0;
   
     // Add new repositories
     if (reposAdded.length > 0) {
       let repoRows = reposAdded.map((repo) => ({
         installation_id: installRow.id,
         github_repo_id: repo.id,
         full_name: repo.full_name,
         private: repo.private ?? false,
         enabled: true,
       }));

       if (userId) {
         repoRows = await filterAllowedRepoRows(userId, repoRows);
         blockedByLimit = reposAdded.length - repoRows.length;
       }
   
       if (repoRows.length > 0) {
         const { error: repoError } = await supabaseAdmin
           .from('repositories')
           .upsert(repoRows, { onConflict: 'github_repo_id' });
   
         if (repoError) {
           throw new Error(`Failed to upsert repos: ${repoError.message}`);
         }
       }
     }
   
     // Remove repositories that were unselected
     if (reposRemoved.length > 0) {
       const removedIds = reposRemoved.map((repo) => repo.id);
       await supabaseAdmin
         .from('repositories')
         .delete()
         .in('github_repo_id', removedIds);
     }

     if (userId && (reposAdded.length > 0 || reposRemoved.length > 0)) {
       await syncReposConnected(userId);
     }
   
     return `installation:${action}:${installationId}:repos+${reposAdded.length}:repos-${reposRemoved.length}:blocked-${blockedByLimit}`;
   }

   type RepoInsertRow = {
     installation_id: string;
     github_repo_id: number;
     full_name: string;
     private: boolean;
     enabled: boolean;
   };

   async function filterAllowedRepoRows(
     userId: string,
     repoRows: RepoInsertRow[]
   ): Promise<RepoInsertRow[]> {
     const repoIds = repoRows.map((repo) => repo.github_repo_id);
     const { data: existingRows } = await supabaseAdmin
       .from('repositories')
       .select('github_repo_id')
       .in('github_repo_id', repoIds);

     const existingRepoIds = new Set(
       ((existingRows ?? []) as Array<{ github_repo_id: number }>).map(
         (repo) => repo.github_repo_id
       )
     );

     let connectedCount = await syncReposConnected(userId);
     const allowedRows: RepoInsertRow[] = [];

     for (const repoRow of repoRows) {
       if (existingRepoIds.has(repoRow.github_repo_id)) {
         allowedRows.push(repoRow);
         continue;
       }

       await supabaseAdmin
         .from('users')
         .update({ repos_connected: connectedCount })
         .eq('id', userId);

       const limit = await checkRepoLimit(userId);
       if (!limit.allowed) {
         console.warn('[installation] repo limit reached', {
           userId,
           repo: repoRow.full_name,
           reason: limit.reason,
         });
         continue;
       }

       allowedRows.push(repoRow);
       connectedCount += 1;
     }

     return allowedRows;
   }
