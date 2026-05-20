-- Migration 008: Pricing, Whop memberships, and monthly usage limits
--
-- Adds plan state and usage counters to users, plus an audit table for
-- plan changes. The operator will run this manually in Supabase.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whop_membership_id TEXT,
  ADD COLUMN IF NOT EXISTS pr_reviews_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mcp_reviews_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS repos_connected INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_plan_check
    CHECK (plan IN ('free', 'starter', 'team', 'pro'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_plan_status_check
    CHECK (plan_status IN ('active', 'trialing', 'cancelled', 'past_due'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_review_counts_nonnegative_check
    CHECK (pr_reviews_this_month >= 0 AND mcp_reviews_this_month >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_repos_connected_nonnegative_check
    CHECK (repos_connected >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_whop_membership_id_key
  ON users (whop_membership_id)
  WHERE whop_membership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_plan_idx
  ON users (plan, plan_status);

CREATE TABLE IF NOT EXISTS plan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_plan TEXT,
  to_plan TEXT,
  whop_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_events_event_type_check CHECK (
    event_type IN (
      'upgraded',
      'downgraded',
      'trial_started',
      'trial_ended',
      'cancelled',
      'reactivated',
      'payment_failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS plan_events_user_id_created_at_idx
  ON plan_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS plan_events_whop_event_id_idx
  ON plan_events (whop_event_id);

ALTER TABLE plan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_events_select_self ON plan_events;

CREATE POLICY plan_events_select_self ON plan_events
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );
