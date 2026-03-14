-- ============================================================
-- MIGRATION 00013: MANUAL TRAINING SESSIONS
-- Minthy Training - Non-competitive manual fallback sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS manual_training_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  sets_data       JSONB NOT NULL DEFAULT '[]',
  total_volume    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  is_competitive  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT manual_training_sessions_noncompetitive CHECK (is_competitive = FALSE)
);

CREATE INDEX idx_manual_training_sessions_athlete_id
  ON manual_training_sessions(athlete_id);

CREATE INDEX idx_manual_training_sessions_machine_id
  ON manual_training_sessions(machine_id);

CREATE INDEX idx_manual_training_sessions_gym_id
  ON manual_training_sessions(gym_id);

CREATE INDEX idx_manual_training_sessions_created_at
  ON manual_training_sessions(created_at DESC);

CREATE INDEX idx_manual_training_sessions_athlete_time
  ON manual_training_sessions(athlete_id, created_at DESC);

ALTER TABLE manual_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes view own manual training sessions"
  ON manual_training_sessions FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes insert own manual training sessions"
  ON manual_training_sessions FOR INSERT
  WITH CHECK (athlete_id = auth.uid() AND is_competitive = FALSE);
