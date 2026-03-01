-- ============================================================
-- MIGRATION 00002: MACHINES SCHEMA
-- Minthy Training - Machines, exercises, QR codes, tutorials
-- ============================================================

-- ==================== TABLE: machines ====================

CREATE TABLE IF NOT EXISTS machines (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  muscle_groups       muscle_group[],
  equipment_type      equipment_type DEFAULT 'machine',
  status              machine_status DEFAULT 'available',
  location            TEXT,
  image_url           TEXT,
  manufacturer        TEXT,
  model               TEXT,
  purchase_date       DATE,
  last_maintenance    DATE,
  instructions        TEXT,
  settings            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machines_gym_id ON machines(gym_id);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_equipment_type ON machines(equipment_type);

CREATE TRIGGER machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: exercises ====================

CREATE TABLE IF NOT EXISTS exercises (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id              UUID REFERENCES gyms(id) ON DELETE CASCADE,        -- NULL = global exercise
  machine_id          UUID REFERENCES machines(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  instructions        TEXT,
  muscle_groups       muscle_group[],
  equipment_type      equipment_type,
  is_compound         BOOLEAN DEFAULT FALSE,
  video_url           TEXT,
  image_url           TEXT,
  difficulty_level    INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_gym_id ON exercises(gym_id);
CREATE INDEX idx_exercises_machine_id ON exercises(machine_id);
CREATE INDEX idx_exercises_is_public ON exercises(is_public);
CREATE INDEX idx_exercises_equipment_type ON exercises(equipment_type);

CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: qr_codes ====================

CREATE TABLE IF NOT EXISTS qr_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  code            TEXT UNIQUE NOT NULL,
  qr_image_url    TEXT,
  scans_count     INT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_codes_machine_id ON qr_codes(machine_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);

-- ==================== TABLE: machine_tutorials ====================

CREATE TABLE IF NOT EXISTS machine_tutorials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  content             TEXT,
  video_url           TEXT,
  difficulty_level    INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  duration_minutes    INT,
  steps               JSONB DEFAULT '[]',
  order_index         INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machine_tutorials_machine_id ON machine_tutorials(machine_id);
CREATE INDEX idx_machine_tutorials_order ON machine_tutorials(machine_id, order_index);

-- ==================== TABLE: user_tutorial_progress ====================

CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutorial_id         UUID NOT NULL REFERENCES machine_tutorials(id) ON DELETE CASCADE,
  completed           BOOLEAN DEFAULT FALSE,
  progress_percent    INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, tutorial_id)
);

CREATE INDEX idx_user_tutorial_progress_profile_id ON user_tutorial_progress(profile_id);
CREATE INDEX idx_user_tutorial_progress_tutorial_id ON user_tutorial_progress(tutorial_id);

-- Function to increment QR scan count
CREATE OR REPLACE FUNCTION increment_qr_scan(p_qr_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE qr_codes
  SET
    scans_count = scans_count + 1,
    last_scanned_at = NOW()
  WHERE code = p_qr_code AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
