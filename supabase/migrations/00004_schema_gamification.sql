-- ============================================================
-- MIGRATION 00004: GAMIFICATION SCHEMA
-- Minthy Training - Achievements, challenges, rankings, points
-- ============================================================

-- ==================== TABLE: user_stats ====================
-- Must be created before triggers in workout schema reference it

CREATE TABLE IF NOT EXISTS user_stats (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id              UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_sessions          INT DEFAULT 0,
  total_volume_kg         NUMERIC(12,2) DEFAULT 0,
  total_sets              INT DEFAULT 0,
  total_reps              INT DEFAULT 0,
  current_streak          INT DEFAULT 0,
  longest_streak          INT DEFAULT 0,
  total_points            INT DEFAULT 0,
  level                   INT DEFAULT 1,
  personal_records_count  INT DEFAULT 0,
  achievements_count      INT DEFAULT 0,
  last_workout_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stats_profile_id ON user_stats(profile_id);
CREATE INDEX idx_user_stats_total_points ON user_stats(total_points DESC);

CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: achievements ====================

CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  category    achievement_category,
  icon_name   TEXT,
  icon_color  TEXT DEFAULT '#6366F1',
  points      INT DEFAULT 0,
  criteria    JSONB DEFAULT '{}', -- e.g. {"type": "sessions", "value": 10}
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TABLE: user_achievements ====================

CREATE TABLE IF NOT EXISTS user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, achievement_id)
);

CREATE INDEX idx_user_achievements_profile_id ON user_achievements(profile_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- ==================== TABLE: challenges ====================

CREATE TABLE IF NOT EXISTS challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID REFERENCES gyms(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  target_value    NUMERIC(10,2),
  target_type     TEXT CHECK (target_type IN ('sessions', 'volume', 'streak', 'reps', 'sets')),
  points_reward   INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_gym_id ON challenges(gym_id);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- ==================== TABLE: user_challenges ====================

CREATE TABLE IF NOT EXISTS user_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_value   NUMERIC(10,2) DEFAULT 0,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, challenge_id)
);

CREATE INDEX idx_user_challenges_profile_id ON user_challenges(profile_id);
CREATE INDEX idx_user_challenges_challenge_id ON user_challenges(challenge_id);

-- ==================== TABLE: rankings ====================

CREATE TABLE IF NOT EXISTS rankings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  period_type     TEXT DEFAULT 'monthly'
                    CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
  metric          TEXT NOT NULL
                    CHECK (metric IN ('sessions', 'volume', 'points', 'streak', 'achievements')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rankings_gym_id ON rankings(gym_id);

-- ==================== TABLE: ranking_entries ====================

CREATE TABLE IF NOT EXISTS ranking_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranking_id      UUID NOT NULL REFERENCES rankings(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank            INT,
  value           NUMERIC(10,2),
  period_start    DATE,
  period_end      DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ranking_entries_ranking_id ON ranking_entries(ranking_id);
CREATE INDEX idx_ranking_entries_profile_id ON ranking_entries(profile_id);
CREATE INDEX idx_ranking_entries_rank ON ranking_entries(ranking_id, rank);

-- ==================== TABLE: points_history ====================

CREATE TABLE IF NOT EXISTS points_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points          INT NOT NULL,
  reason          TEXT,
  reference_id    UUID,     -- session_id, achievement_id, challenge_id, etc.
  reference_type  TEXT,     -- 'session', 'achievement', 'challenge', 'bonus'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_history_profile_id ON points_history(profile_id);
CREATE INDEX idx_points_history_created_at ON points_history(created_at DESC);

-- ==================== FUNCTION: add_points_to_user ====================

CREATE OR REPLACE FUNCTION add_points_to_user(
  p_profile_id    UUID,
  p_points        INT,
  p_reason        TEXT DEFAULT NULL,
  p_reference_id  UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Add points history record
  INSERT INTO points_history (profile_id, points, reason, reference_id, reference_type)
  VALUES (p_profile_id, p_points, p_reason, p_reference_id, p_reference_type);

  -- Update user stats
  INSERT INTO user_stats (profile_id, total_points)
  VALUES (p_profile_id, p_points)
  ON CONFLICT (profile_id) DO UPDATE
    SET
      total_points = user_stats.total_points + p_points,
      level = FLOOR(SQRT((user_stats.total_points + p_points)::NUMERIC / 100)) + 1,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== FUNCTION: check_achievements ====================

CREATE OR REPLACE FUNCTION check_achievements(p_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats         user_stats%ROWTYPE;
  v_achievement   achievements%ROWTYPE;
  v_criteria      JSONB;
  v_criterion_val NUMERIC;
  v_user_val      NUMERIC;
  v_already_has   BOOLEAN;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE profile_id = p_profile_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Loop through all active achievements
  FOR v_achievement IN SELECT * FROM achievements WHERE is_active = TRUE LOOP
    -- Skip if already unlocked
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE profile_id = p_profile_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;
    CONTINUE WHEN v_already_has;

    v_criteria := v_achievement.criteria;

    -- Check criteria based on type
    CASE v_criteria->>'type'
      WHEN 'sessions' THEN
        v_criterion_val := (v_criteria->>'value')::NUMERIC;
        v_user_val := v_stats.total_sessions;
      WHEN 'streak' THEN
        v_criterion_val := (v_criteria->>'value')::NUMERIC;
        v_user_val := GREATEST(v_stats.current_streak, v_stats.longest_streak);
      WHEN 'volume' THEN
        v_criterion_val := (v_criteria->>'value')::NUMERIC;
        v_user_val := v_stats.total_volume_kg;
      WHEN 'prs' THEN
        v_criterion_val := (v_criteria->>'value')::NUMERIC;
        v_user_val := v_stats.personal_records_count;
      ELSE
        CONTINUE;
    END CASE;

    -- Award achievement if criteria met
    IF v_user_val >= v_criterion_val THEN
      INSERT INTO user_achievements (profile_id, achievement_id)
      VALUES (p_profile_id, v_achievement.id)
      ON CONFLICT DO NOTHING;

      -- Award points
      IF v_achievement.points > 0 THEN
        PERFORM add_points_to_user(
          p_profile_id,
          v_achievement.points,
          'Achievement unlocked: ' || v_achievement.name,
          v_achievement.id,
          'achievement'
        );
      END IF;

      -- Update achievement count in stats
      UPDATE user_stats
      SET achievements_count = achievements_count + 1, updated_at = NOW()
      WHERE profile_id = p_profile_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== BASE ACHIEVEMENTS ====================

INSERT INTO achievements (name, description, category, icon_name, icon_color, points, criteria) VALUES
  (
    'Primera Sesión',
    '¡Completaste tu primer entrenamiento en Minthy!',
    'milestone',
    'Dumbbell',
    '#6366F1',
    50,
    '{"type": "sessions", "value": 1}'
  ),
  (
    '10 Sesiones',
    'Has completado 10 sesiones de entrenamiento.',
    'consistency',
    'TrendingUp',
    '#8B5CF6',
    100,
    '{"type": "sessions", "value": 10}'
  ),
  (
    '50 Sesiones',
    'Leyenda: 50 sesiones completadas.',
    'consistency',
    'Award',
    '#F59E0B',
    500,
    '{"type": "sessions", "value": 50}'
  ),
  (
    'Racha de 7 días',
    'Entrena 7 días consecutivos.',
    'consistency',
    'Flame',
    '#EF4444',
    150,
    '{"type": "streak", "value": 7}'
  ),
  (
    'Racha de 30 días',
    '¡Increíble! 30 días seguidos entrenando.',
    'consistency',
    'Zap',
    '#F97316',
    750,
    '{"type": "streak", "value": 30}'
  ),
  (
    'Primer PR',
    'Lograste tu primer récord personal.',
    'strength',
    'Trophy',
    '#10B981',
    75,
    '{"type": "prs", "value": 1}'
  ),
  (
    '10 Récords Personales',
    'Has batido 10 récords personales.',
    'strength',
    'Star',
    '#059669',
    300,
    '{"type": "prs", "value": 10}'
  ),
  (
    'Volumen 1,000 kg',
    'Has levantado un total de 1,000 kg.',
    'volume',
    'BarChart2',
    '#3B82F6',
    200,
    '{"type": "volume", "value": 1000}'
  ),
  (
    'Volumen 10,000 kg',
    'Monstruo del hierro: 10,000 kg levantados.',
    'volume',
    'Crown',
    '#1D4ED8',
    1000,
    '{"type": "volume", "value": 10000}'
  )
ON CONFLICT DO NOTHING;
