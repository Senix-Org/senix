import { supabaseAdmin } from '@features/shared/supabase';
   
   /**
    * Look up our internal repository record by GitHub repo ID.
    * Returns the row or null if we don't have it (which means installation event
    * hasn't been processed yet, or the repo was removed).
    */
   export async function findRepository(githubRepoId: number) {
     const { data } = await supabaseAdmin
       .from('repositories')
       .select('*, installations(installed_by_user_id)')
       .eq('github_repo_id', githubRepoId)
       .single();
     return data;
   }
