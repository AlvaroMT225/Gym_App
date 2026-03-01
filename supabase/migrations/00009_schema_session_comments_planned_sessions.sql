-- ============================================================
-- MIGRATION 00009: SESSION COMMENTS + PLANNED SESSIONS
-- Comentarios de entrenador sobre sesiones específicas del atleta
-- y sesiones sugeridas del entrenador hacia el atleta
-- ============================================================

-- ==================== TABLE: session_comments ====================

CREATE TABLE IF NOT EXISTS session_comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID        NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  coach_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_comments_session    ON session_comments(session_id);
CREATE INDEX idx_session_comments_coach      ON session_comments(coach_id);
CREATE INDEX idx_session_comments_athlete    ON session_comments(athlete_id);

-- ==================== RLS: session_comments ====================

ALTER TABLE session_comments ENABLE ROW LEVEL SECURITY;

-- El coach puede leer sus propios comentarios
CREATE POLICY "coach_read_session_comments"
  ON session_comments FOR SELECT
  USING (coach_id = auth.uid());

-- El coach puede insertar comentarios sobre sesiones de sus atletas
CREATE POLICY "coach_insert_session_comments"
  ON session_comments FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- El atleta puede leer comentarios sobre sus propias sesiones
CREATE POLICY "athlete_read_own_session_comments"
  ON session_comments FOR SELECT
  USING (athlete_id = auth.uid());

-- ==================== TABLE: planned_sessions ====================

CREATE TABLE IF NOT EXISTS planned_sessions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (char_length(title) > 0),
  description  TEXT        NOT NULL DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'completed')),
  content      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  version      INT         NOT NULL DEFAULT 1,
  changelog    TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planned_sessions_coach   ON planned_sessions(coach_id);
CREATE INDEX idx_planned_sessions_athlete ON planned_sessions(athlete_id);
CREATE INDEX idx_planned_sessions_status  ON planned_sessions(status);

CREATE TRIGGER planned_sessions_updated_at
  BEFORE UPDATE ON planned_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS: planned_sessions ====================

ALTER TABLE planned_sessions ENABLE ROW LEVEL SECURITY;

-- El coach puede gestionar (leer, crear, editar, eliminar) sus sesiones sugeridas
CREATE POLICY "coach_manage_planned_sessions"
  ON planned_sessions FOR ALL
  USING (coach_id = auth.uid());

-- El atleta puede leer sesiones sugeridas dirigidas a él
CREATE POLICY "athlete_read_own_planned_sessions"
  ON planned_sessions FOR SELECT
  USING (athlete_id = auth.uid());

-- El atleta puede actualizar el status (aceptar/rechazar) de sus sesiones sugeridas
CREATE POLICY "athlete_update_status_planned_sessions"
  ON planned_sessions FOR UPDATE
  USING  (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
