import { createClient } from '@supabase/supabase-js';
   
   // Service-role client for server-side use only. Bypasses RLS.
   export const supabaseAdmin = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { auth: { persistSession: false } }
   );