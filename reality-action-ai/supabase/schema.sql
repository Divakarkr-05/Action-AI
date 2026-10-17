-- ─────────────────────────────────────────────────────────────
-- REALITY → ACTION AI — Supabase Database Schema
-- Run this SQL in the Supabase SQL Editor to create the
-- required table and Row Level Security policies.
-- ─────────────────────────────────────────────────────────────

-- ── Analysis History Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT,
  what_i_see  TEXT,
  what_is_happening TEXT,
  next_action TEXT,
  steps       JSONB,
  confidence  NUMERIC,
  safety_warning TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index for fast user-scoped queries ────────────────────────
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id
  ON analysis_history(user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at
  ON analysis_history(created_at DESC);

-- ── Enable Row Level Security ─────────────────────────────────
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────────

-- Users can only SELECT their own analysis history
CREATE POLICY "Users can view own analysis history"
  ON analysis_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT their own analysis history
CREATE POLICY "Users can insert own analysis history"
  ON analysis_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own analysis history
CREATE POLICY "Users can delete own analysis history"
  ON analysis_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Full-text search support (optional, for search feature) ──
-- Creates a generated column for full-text search across
-- question, what_i_see, and what_is_happening fields
ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(question, '') || ' ' ||
      COALESCE(what_i_see, '') || ' ' ||
      COALESCE(what_is_happening, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_analysis_history_search
  ON analysis_history USING GIN (search_vector);
