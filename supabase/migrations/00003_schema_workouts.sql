-- ============================================================
-- MIGRATION 00003: WORKOUTS SCHEMA
-- Minthy Training - Routines, sessions, sets, personal records
-- ============================================================

-- ==================== TABLE: routines ====================

CREATE TABLE IF NOT EXISTS routines (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id                      UUID REFERENCES gyms(id) ON DELETE SET NULL,
  name                        TEXT NOT NULL,
  description                 TEXT,
  created_by                  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_template                 BOOLEAN DEFAULT FALSE,
  is_active                   BOOLEAN DEFAULT TRUE,
  days_per_week               INT DEFAULT 3 CHECK (days_per_week BETWEEN 1 AND 7),
  estimated_duration_minutes  INT,
  difficulty_level            INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  tags                        TEXT[],
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routines_profile_id ON routines(profile_id);
CREATE INDEX idx_routines_gym_id ON routines(gym_id);
CREATE INDEX idx_routines_is_active ON routines(is_active);

CREATE TRIGGER routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: routine_exercises ====================

CREATE TABLE IF NOT EXISTS routine_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index     INT DEFAULT 0,
  sets_target     INT DEFAULT 3,
  reps_target     INT DEFAULT 10,
  weight_target   NUMERIC(6,2),
  rest_seconds    INT DEFAULT 60,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);
CREATE INDEX idx_routine_exercises_order ON routine_exercises(routine_id, order_index);

-- ==================== TABLE: workout_sessions ====================

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id          UUID REFERENCES routines(id) ON DELETE SET NULL,
  gym_id              UUID REFERENCES gyms(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  duration_minutes    INT,
  total_volume_kg     NUMERIC(10,2) DEFAULT 0,
  total_sets          INT DEFAULT 0,
  total_reps          INT DEFAULT 0,
  notes               TEXT,
  rating              INT CHECK (rating BETWEEN 1 AND 5),
  session_type        TEXT DEFAULT 'gym'
                        CHECK (session_type IN ('gym', 'home', 'outdoor', 'virtual')),
  status              TEXT DEFAULT 'active'
                        CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sessions_profile_id ON workout_sessions(profile_id);
CREATE INDEX idx_workout_sessions_routine_id ON workout_sessions(routine_id);
CREATE INDEX idx_workout_sessions_started_at ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sessions_status ON workout_sessions(status);

CREATE TRIGGER workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: workout_sets ====================

CREATE TABLE IF NOT EXISTS workout_sets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number          INT NOT NULL,
  reps_done           INT,
  weight_kg           NUMERIC(6,2),
  duration_seconds    INT,
  rest_seconds        INT,
  rpe                 INT CHECK (rpe BETWEEN 1 AND 10),
  notes               TEXT,
  origin              set_origin DEFAULT 'manual',
  is_personal_record  BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);

-- ==================== TABLE: personal_records ====================

CREATE TABLE IF NOT EXISTS personal_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type     TEXT DEFAULT '1rm'
                    CHECK (record_type IN ('1rm', 'max_reps', 'max_volume', 'best_time')),
  value           NUMERIC(10,2) NOT NULL,
  previous_value  NUMERIC(10,2),
  set_id          UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  achieved_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_records_profile_id ON personal_records(profile_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_personal_records_achieved_at ON personal_records(achieved_at DESC);

-- ==================== TABLE: session_machines ====================

CREATE TABLE IF NOT EXISTS session_machines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  qr_code_id      UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  accessed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_machines_session_id ON session_machines(session_id);
CREATE INDEX idx_session_machines_machine_id ON session_machines(machine_id);

-- ==================== FUNCTION: update_session_stats ====================
-- Automatically updates session totals when a set is added/updated/deleted

CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.session_id;
  ELSE
    v_session_id := NEW.session_id;
  END IF;

  UPDATE workout_sessions SET
    total_volume_kg = COALESCE((
      SELECT SUM(COALESCE(weight_kg, 0) * COALESCE(reps_done, 0))
      FROM workout_sets
      WHERE session_id = v_session_id
    ), 0),
    total_sets = (
      SELECT COUNT(*) FROM workout_sets WHERE session_id = v_session_id
    ),
    total_reps = COALESCE((
      SELECT SUM(COALESCE(reps_done, 0))
      FROM workout_sets
      WHERE session_id = v_session_id
    ), 0),
    updated_at = NOW()
  WHERE id = v_session_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_session_stats
  AFTER INSERT OR UPDATE OR DELETE ON workout_sets
  FOR EACH ROW EXECUTE FUNCTION update_session_stats();

-- ==================== FUNCTION: check_and_record_pr ====================
-- Checks if a set is a new personal record and records it

CREATE OR REPLACE FUNCTION check_and_record_pr()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id    UUID;
  v_exercise_id   UUID;
  v_current_best  NUMERIC(10,2);
  v_new_1rm       NUMERIC(10,2);
BEGIN
  -- Get session owner
  SELECT profile_id INTO v_profile_id
  FROM workout_sessions
  WHERE id = NEW.session_id;

  v_exercise_id := NEW.exercise_id;

  -- Calculate estimated 1RM using Epley formula: weight * (1 + reps/30)
  IF NEW.weight_kg IS NOT NULL AND NEW.reps_done IS NOT NULL AND NEW.reps_done > 0 THEN
    v_new_1rm := NEW.weight_kg * (1 + NEW.reps_done::NUMERIC / 30);

    -- Get current PR
    SELECT value INTO v_current_best
    FROM personal_records
    WHERE profile_id = v_profile_id
      AND exercise_id = v_exercise_id
      AND record_type = '1rm'
    ORDER BY value DESC
    LIMIT 1;

    IF v_current_best IS NULL OR v_new_1rm > v_current_best THEN
      -- Mark set as PR
      NEW.is_personal_record := TRUE;

      -- Insert PR record
      INSERT INTO personal_records (
        profile_id, exercise_id, record_type,
        value, previous_value, set_id, achieved_at
      ) VALUES (
        v_profile_id, v_exercise_id, '1rm',
        v_new_1rm, v_current_best, NEW.id, NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_pr
  BEFORE INSERT ON workout_sets
  FOR EACH ROW EXECUTE FUNCTION check_and_record_pr();

-- ==================== FUNCTION: update_user_streak ====================
-- Updates user streak when a session is completed

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_workout_date   DATE;
  v_current_streak      INT;
  v_longest_streak      INT;
BEGIN
  -- Only fire when session is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    SELECT last_workout_at::DATE, current_streak, longest_streak
    INTO v_last_workout_date, v_current_streak, v_longest_streak
    FROM user_stats
    WHERE profile_id = NEW.profile_id;

    IF NOT FOUND THEN
      -- Create user_stats record if not exists
      INSERT INTO user_stats (profile_id, current_streak, longest_streak, last_workout_at)
      VALUES (NEW.profile_id, 1, 1, NOW())
      ON CONFLICT (profile_id) DO NOTHING;
    ELSE
      -- Update streak
      IF v_last_workout_date = CURRENT_DATE - 1 THEN
        -- Consecutive day: increment streak
        v_current_streak := v_current_streak + 1;
      ELSIF v_last_workout_date = CURRENT_DATE THEN
        -- Same day: no streak change
        NULL;
      ELSE
        -- Streak broken: reset to 1
        v_current_streak := 1;
      END IF;

      v_longest_streak := GREATEST(v_current_streak, COALESCE(v_longest_streak, 0));

      UPDATE user_stats SET
        total_sessions = total_sessions + 1,
        total_volume_kg = total_volume_kg + COALESCE(NEW.total_volume_kg, 0),
        total_sets = total_sets + COALESCE(NEW.total_sets, 0),
        total_reps = total_reps + COALESCE(NEW.total_reps, 0),
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_workout_at = NOW(),
        updated_at = NOW()
      WHERE profile_id = NEW.profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_streak
  AFTER UPDATE ON workout_sessions
  FOR EACH ROW EXECUTE FUNCTION update_user_streak();
