-- ============================================================
-- MIGRATION 00014: WORKOUT SESSION SOURCE LIFECYCLE
-- Minthy Training - Canonical history parent for QR/manual flows
-- ============================================================

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS source_flow TEXT
    CHECK (source_flow IN ('qr', 'manual')),
  ADD COLUMN IF NOT EXISTS competitive BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE workout_sessions
SET
  source_flow = CASE
    WHEN notes = 'qr' THEN 'qr'
    ELSE 'manual'
  END,
  competitive = CASE
    WHEN notes = 'qr' THEN TRUE
    ELSE FALSE
  END
WHERE source_flow IS NULL;

ALTER TABLE workout_sessions
  ALTER COLUMN source_flow SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_workout_sessions_source_flow
  ON workout_sessions(source_flow);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_profile_source_updated
  ON workout_sessions(profile_id, source_flow, updated_at DESC);

ALTER TABLE IF EXISTS manual_training_sessions
  ADD COLUMN IF NOT EXISTS workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manual_training_sessions_workout_session_id
  ON manual_training_sessions(workout_session_id);

ALTER TABLE IF EXISTS qr_sessions
  ADD COLUMN IF NOT EXISTS workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_sessions_workout_session_id
  ON qr_sessions(workout_session_id);
