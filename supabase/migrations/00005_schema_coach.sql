-- ============================================================
-- MIGRATION 00005: COACH SCHEMA
-- Minthy Training - Consents, proposals, templates, calendar, alerts
-- ============================================================

-- ==================== TABLE: consents ====================

CREATE TABLE IF NOT EXISTS consents (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                  consent_status DEFAULT 'pending',
  scope                   consent_scope[] DEFAULT '{}',
  notes                   TEXT,
  expires_at              TIMESTAMPTZ,
  granted_at              TIMESTAMPTZ,
  revoked_at              TIMESTAMPTZ,
  revoked_reason          TEXT,
  is_hidden_by_athlete    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CHECK (athlete_id != coach_id)
);

CREATE INDEX idx_consents_athlete_id ON consents(athlete_id);
CREATE INDEX idx_consents_coach_id ON consents(coach_id);
CREATE INDEX idx_consents_status ON consents(status);

CREATE TRIGGER consents_updated_at
  BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: client_notes ====================

CREATE TABLE IF NOT EXISTS client_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_private  BOOLEAN DEFAULT TRUE,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_notes_coach_id ON client_notes(coach_id);
CREATE INDEX idx_client_notes_athlete_id ON client_notes(athlete_id);

CREATE TRIGGER client_notes_updated_at
  BEFORE UPDATE ON client_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: proposals ====================

CREATE TABLE IF NOT EXISTS proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            proposal_type DEFAULT 'routine',
  status          proposal_status DEFAULT 'draft',
  title           TEXT NOT NULL,
  description     TEXT,
  content         JSONB DEFAULT '{}',
  expires_at      TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  response_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_coach_id ON proposals(coach_id);
CREATE INDEX idx_proposals_athlete_id ON proposals(athlete_id);
CREATE INDEX idx_proposals_status ON proposals(status);

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: templates ====================

CREATE TABLE IF NOT EXISTS templates (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  description                 TEXT,
  muscle_groups               muscle_group[],
  difficulty_level            INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  days_per_week               INT DEFAULT 3 CHECK (days_per_week BETWEEN 1 AND 7),
  estimated_duration_minutes  INT,
  is_public                   BOOLEAN DEFAULT FALSE,
  tags                        TEXT[],
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_coach_id ON templates(coach_id);
CREATE INDEX idx_templates_is_public ON templates(is_public);

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: template_exercises ====================

CREATE TABLE IF NOT EXISTS template_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index     INT DEFAULT 0,
  sets_target     INT DEFAULT 3,
  reps_target     INT DEFAULT 10,
  weight_target   NUMERIC(6,2),
  rest_seconds    INT DEFAULT 60,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_exercises_template_id ON template_exercises(template_id);
CREATE INDEX idx_template_exercises_exercise_id ON template_exercises(exercise_id);

-- ==================== TABLE: coach_calendar_events ====================

CREATE TABLE IF NOT EXISTS coach_calendar_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  event_date          DATE NOT NULL,
  start_time          TIME,
  end_time            TIME,
  event_type          TEXT DEFAULT 'session'
                        CHECK (event_type IN ('session', 'meeting', 'evaluation', 'reminder', 'other')),
  is_recurring        BOOLEAN DEFAULT FALSE,
  recurrence_pattern  JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_calendar_events_coach_id ON coach_calendar_events(coach_id);
CREATE INDEX idx_coach_calendar_events_event_date ON coach_calendar_events(event_date);

CREATE TRIGGER coach_calendar_events_updated_at
  BEFORE UPDATE ON coach_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: coach_alerts ====================

CREATE TABLE IF NOT EXISTS coach_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type  TEXT NOT NULL
                CHECK (alert_type IN ('inactivity', 'consent_expiring', 'milestone', 'payment_overdue', 'new_pr', 'goal_achieved')),
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  priority    TEXT DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_alerts_coach_id ON coach_alerts(coach_id);
CREATE INDEX idx_coach_alerts_is_read ON coach_alerts(coach_id, is_read);

-- ==================== TABLE: coach_stats ====================

CREATE TABLE IF NOT EXISTS coach_stats (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id                    UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_clients               INT DEFAULT 0,
  active_clients              INT DEFAULT 0,
  total_proposals_sent        INT DEFAULT 0,
  total_routines_created      INT DEFAULT 0,
  avg_client_retention_days   INT DEFAULT 0,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER coach_stats_updated_at
  BEFORE UPDATE ON coach_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== FUNCTION: update_athlete_coach_status ====================
-- Updates athlete's coach_id when consent changes

CREATE OR REPLACE FUNCTION update_athlete_coach_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Assign coach to athlete
    UPDATE profiles SET
      coach_id = NEW.coach_id,
      coach_assigned_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.athlete_id;

    -- Update coach stats
    INSERT INTO coach_stats (coach_id, total_clients, active_clients)
    VALUES (NEW.coach_id, 1, 1)
    ON CONFLICT (coach_id) DO UPDATE
      SET
        total_clients = coach_stats.total_clients + 1,
        active_clients = coach_stats.active_clients + 1,
        updated_at = NOW();

  ELSIF NEW.status IN ('revoked', 'expired') AND OLD.status = 'active' THEN
    -- Remove coach from athlete if this is their current coach
    UPDATE profiles SET
      coach_id = NULL,
      coach_assigned_at = NULL,
      updated_at = NOW()
    WHERE id = NEW.athlete_id AND coach_id = NEW.coach_id;

    -- Decrement active clients
    UPDATE coach_stats SET
      active_clients = GREATEST(0, active_clients - 1),
      updated_at = NOW()
    WHERE coach_id = NEW.coach_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_athlete_coach_status
  AFTER UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION update_athlete_coach_status();

-- ==================== FUNCTION: check_expiring_consents ====================
-- Creates alerts for consents expiring within 7 days

CREATE OR REPLACE FUNCTION check_expiring_consents()
RETURNS VOID AS $$
DECLARE
  v_consent consents%ROWTYPE;
BEGIN
  FOR v_consent IN
    SELECT * FROM consents
    WHERE
      status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  LOOP
    -- Alert for coach
    INSERT INTO coach_alerts (coach_id, athlete_id, alert_type, message, priority)
    VALUES (
      v_consent.coach_id,
      v_consent.athlete_id,
      'consent_expiring',
      'El consentimiento del atleta vence pronto.',
      'high'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
