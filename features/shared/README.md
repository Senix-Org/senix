# Shared

Cross cutting code that is not a product feature on its own. Kept deliberately small so features stay decoupled.

Contents:

1. `supabase.ts`, `supabase-server.ts`, `supabase-browser.ts`: Supabase client factories. The service role admin client bypasses RLS and is used only by trusted server paths (webhook handlers, worker, setup linking, internal tools). The server and browser clients are session scoped.
2. `relative-time.ts`: timestamp formatting used by dashboard and token UI.
3. `components/`: shared chrome and marketing UI (site nav, mobile nav, footer, reveal animations, sign in and sign out buttons, docs layout elements).

Rule: nothing in `shared` may import from a feature folder. Features import from `shared`, never the other way around. This keeps the dependency direction one way and protects portability.
