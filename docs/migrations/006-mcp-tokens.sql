-- Migration 006: MCP personal access tokens
--
-- Backs the MCP server (/api/mcp). Each row is a personal access token a
-- user pastes into their IDE's MCP config. We store only the SHA-256 hash
-- of the token — the plaintext is shown to the user exactly once at
-- generation time and never persisted.
--
-- The MCP route authenticates with `supabaseAdmin` (no user session), so
-- it bypasses RLS. The policies below scope the dashboard's user-context
-- reads/writes (list, generate, revoke) to the signed-in user.
--
-- Run in the Supabase SQL editor.

CREATE TABLE mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_tokens_select_self ON mcp_tokens
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY mcp_tokens_insert_self ON mcp_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY mcp_tokens_update_self ON mcp_tokens
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
