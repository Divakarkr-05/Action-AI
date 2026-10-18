-- ─────────────────────────────────────────────────────────────
-- REALITY → ACTION AI — Migration: Add Authenticity Fields
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS image_authenticity TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_probability NUMERIC,
  ADD COLUMN IF NOT EXISTS authenticity_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS authenticity_model TEXT,
  ADD COLUMN IF NOT EXISTS authenticity_indicators JSONB;

-- Comment on columns for schema documentation
COMMENT ON COLUMN public.analysis_history.image_authenticity IS
  'AI image authenticity status: LIKELY_REAL, LIKELY_AI_GENERATED, UNCERTAIN, UNAVAILABLE';
COMMENT ON COLUMN public.analysis_history.ai_generated_probability IS
  'Detector estimated probability of being AI-generated (0.0 to 1.0)';
COMMENT ON COLUMN public.analysis_history.authenticity_confidence IS
  'Confidence of the classification assessment (0.0 to 1.0)';
COMMENT ON COLUMN public.analysis_history.authenticity_model IS
  'Name of the authenticity detection model used (e.g. Detectra v3)';
COMMENT ON COLUMN public.analysis_history.authenticity_indicators IS
  'JSON list of indicators from the detector';
