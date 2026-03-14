-- ============================================================
-- MIGRATION 00012: XP ENGINE + RANKINGS
-- Minthy Training - QR Sessions, XP Totals, Rankings recalculation
-- ============================================================

-- ==================== TABLE: qr_sessions ====================
-- Dedicated table for sessions logged via QR code scan.
-- Stores the raw sets, computed volume, XP, and region.

CREATE TABLE IF NOT EXISTS qr_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  region          TEXT NOT NULL CHECK (region IN ('upper', 'lower', 'full_body')),
  sets_data       JSONB NOT NULL DEFAULT '[]',
  total_volume    NUMERIC(12,2) NOT NULL DEFAULT 0,
  factor_progreso NUMERIC(5,3) NOT NULL DEFAULT 1.0,
  session_xp      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_sessions_profile_id   ON qr_sessions(profile_id);
CREATE INDEX idx_qr_sessions_machine_id   ON qr_sessions(machine_id);
CREATE INDEX idx_qr_sessions_gym_id       ON qr_sessions(gym_id);
CREATE INDEX idx_qr_sessions_created_at   ON qr_sessions(created_at DESC);
CREATE INDEX idx_qr_sessions_profile_time ON qr_sessions(profile_id, created_at DESC);

-- ==================== TABLE: athlete_xp_totals ====================
-- JSONB-based XP accumulator per athlete.
-- xp_data = { "upper": <numeric>, "lower": <numeric>, "full_body": <numeric> }

CREATE TABLE IF NOT EXISTS athlete_xp_totals (
  profile_id  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  xp_data     JSONB NOT NULL DEFAULT '{"upper": 0, "lower": 0, "full_body": 0}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athlete_xp_totals_gym_id ON athlete_xp_totals(gym_id);

-- ==================== FUNCTION: recalculate_rankings ====================
-- Recalculates all athlete_xp_totals for a given gym from qr_sessions.
-- Called after each new qr_session is inserted to keep rankings fresh.

CREATE OR REPLACE FUNCTION recalculate_rankings(p_gym_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO athlete_xp_totals (profile_id, gym_id, xp_data, updated_at)
  SELECT
    qs.profile_id,
    p_gym_id,
    jsonb_build_object(
      'upper',
      COALESCE(SUM(CASE WHEN qs.region IN ('upper', 'full_body') THEN qs.session_xp ELSE 0 END), 0),
      'lower',
      COALESCE(SUM(CASE WHEN qs.region IN ('lower', 'full_body') THEN qs.session_xp ELSE 0 END), 0),
      'full_body',
      COALESCE(SUM(CASE WHEN qs.region = 'full_body' THEN qs.session_xp ELSE 0 END), 0)
    ),
    NOW()
  FROM qr_sessions qs
  WHERE qs.gym_id = p_gym_id
  GROUP BY qs.profile_id
  ON CONFLICT (profile_id) DO UPDATE
    SET
      xp_data    = EXCLUDED.xp_data,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
