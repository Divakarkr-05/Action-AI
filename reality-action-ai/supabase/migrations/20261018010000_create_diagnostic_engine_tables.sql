-- ─────────────────────────────────────────────────────────────
-- REALITY → ACTION AI — Diagnostic Intelligence Engine Schema
-- Migration: 20261018010000_create_diagnostic_engine_tables.sql
-- Description: Creates diagnostic_cases and diagnostic_images tables
-- with Row Level Security (RLS) and 7-day expiration indexes.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Diagnostic Cases Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_cases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id             TEXT,
  title                  TEXT NOT NULL DEFAULT 'Untitled Diagnostic Case',
  domain                 TEXT NOT NULL DEFAULT 'ELECTRONICS',
  status                 TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  current_state          TEXT NOT NULL DEFAULT 'OBSERVE',
  investigation_progress NUMERIC NOT NULL DEFAULT 0.1,
  image_quality          JSONB,
  evidence               JSONB DEFAULT '[]'::jsonb,
  fault_boxes            JSONB DEFAULT '[]'::jsonb,
  identified_components  JSONB DEFAULT '[]'::jsonb,
  hypotheses             JSONB DEFAULT '[]'::jsonb,
  active_test            JSONB,
  test_history           JSONB DEFAULT '[]'::jsonb,
  repair_plan            JSONB,
  verification_result    JSONB,
  confidence_timeline    JSONB DEFAULT '[]'::jsonb,
  events                 JSONB DEFAULT '[]'::jsonb,
  initial_image_url      TEXT,
  latest_image_url       TEXT,
  after_image_url        TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  expires_at             TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  resolved_at            TIMESTAMPTZ
);

-- Indexes for performance and lifecycle queries
CREATE INDEX IF NOT EXISTS idx_diag_cases_user_id
  ON diagnostic_cases(user_id);

CREATE INDEX IF NOT EXISTS idx_diag_cases_updated_at
  ON diagnostic_cases(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_diag_cases_expires_at
  ON diagnostic_cases(expires_at);

CREATE INDEX IF NOT EXISTS idx_diag_cases_status
  ON diagnostic_cases(status);

-- ── 2. Diagnostic Images Metadata Table ─────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID REFERENCES diagnostic_cases(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_type   TEXT NOT NULL DEFAULT 'BEFORE',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_diag_images_case_id
  ON diagnostic_images(case_id);

CREATE INDEX IF NOT EXISTS idx_diag_images_user_id
  ON diagnostic_images(user_id);

CREATE INDEX IF NOT EXISTS idx_diag_images_expires_at
  ON diagnostic_images(expires_at);

-- ── 3. Row Level Security (RLS) ────────────────────────────────

ALTER TABLE diagnostic_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_images ENABLE ROW LEVEL SECURITY;

-- diagnostic_cases RLS
CREATE POLICY "Users can view own diagnostic cases"
  ON diagnostic_cases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic cases"
  ON diagnostic_cases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic cases"
  ON diagnostic_cases
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic cases"
  ON diagnostic_cases
  FOR DELETE
  USING (auth.uid() = user_id);

-- diagnostic_images RLS
CREATE POLICY "Users can view own diagnostic images"
  ON diagnostic_images
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic images"
  ON diagnostic_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic images"
  ON diagnostic_images
  FOR DELETE
  USING (auth.uid() = user_id);
