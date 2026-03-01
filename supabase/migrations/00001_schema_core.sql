-- ============================================================
-- MIGRATION 00001: CORE SCHEMA
-- Minthy Training - Base extensions, enums, and core tables
-- ============================================================

-- ==================== EXTENSIONS ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM (
  'athlete',
  'coach',
  'admin',
  'super_admin'
);

CREATE TYPE membership_status AS ENUM (
  'pending',
  'active',
  'inactive',
  'suspended',
  'expired'
);

CREATE TYPE plan_type AS ENUM (
  'basic',
  'premium',
  'vip',
  'custom'
);

CREATE TYPE consent_status AS ENUM (
  'pending',
  'active',
  'revoked',
  'expired'
);

CREATE TYPE consent_scope AS ENUM (
  'view_progress',
  'view_routines',
  'manage_routines',
  'view_personal_records',
  'view_achievements',
  'full_access'
);

CREATE TYPE set_origin AS ENUM (
  'manual',
  'template',
  'ai_suggested'
);

CREATE TYPE machine_status AS ENUM (
  'available',
  'in_use',
  'maintenance',
  'out_of_order'
);

CREATE TYPE muscle_group AS ENUM (
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'arms',
  'legs',
  'glutes',
  'core',
  'full_body',
  'cardio'
);

CREATE TYPE equipment_type AS ENUM (
  'machine',
  'free_weight',
  'cable',
  'bodyweight',
  'cardio',
  'resistance_band'
);

CREATE TYPE proposal_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);

CREATE TYPE proposal_type AS ENUM (
  'routine',
  'goal',
  'nutrition'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'overdue',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'transfer',
  'app'
);

CREATE TYPE promo_status AS ENUM (
  'active',
  'inactive',
  'expired'
);

CREATE TYPE notification_type AS ENUM (
  'workout_reminder',
  'achievement_unlocked',
  'payment_due',
  'consent_expiring',
  'proposal_received',
  'system_message'
);

CREATE TYPE achievement_category AS ENUM (
  'consistency',
  'strength',
  'volume',
  'milestone',
  'social'
);

-- ==================== UTILITY FUNCTION ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================== TABLE: gyms ====================

CREATE TABLE IF NOT EXISTS gyms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'Ecuador',
  phone           TEXT,
  email           TEXT,
  logo_url        TEXT,
  timezone        TEXT DEFAULT 'America/Guayaquil',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER gyms_updated_at
  BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: gym_schedules ====================

CREATE TABLE IF NOT EXISTS gym_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  opens_at        TIME,
  closes_at       TIME,
  is_closed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gym_schedules_gym_id ON gym_schedules(gym_id);

-- ==================== TABLE: profiles ====================

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id              UUID REFERENCES gyms(id) ON DELETE SET NULL,
  role                user_role DEFAULT 'athlete',
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT UNIQUE,
  phone               TEXT,
  avatar_url          TEXT,
  birth_date          DATE,
  gender              TEXT,
  weight_kg           NUMERIC(5,2),
  height_cm           NUMERIC(5,2),
  bio                 TEXT,
  coach_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  coach_assigned_at   TIMESTAMPTZ,
  emergency_contact   JSONB DEFAULT '{}',
  settings            JSONB DEFAULT '{}',
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_gym_id ON profiles(gym_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_coach_id ON profiles(coach_id);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: staff_roles ====================

CREATE TABLE IF NOT EXISTS staff_roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  role            user_role NOT NULL,
  permissions     JSONB DEFAULT '[]',
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  assigned_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(profile_id, gym_id)
);

CREATE INDEX idx_staff_roles_profile_id ON staff_roles(profile_id);
CREATE INDEX idx_staff_roles_gym_id ON staff_roles(gym_id);

-- ==================== TABLE: memberships ====================

CREATE TABLE IF NOT EXISTS memberships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_type       plan_type NOT NULL,
  status          membership_status DEFAULT 'pending',
  start_date      DATE,
  end_date        DATE,
  price_paid      NUMERIC(10,2),
  auto_renew      BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX idx_memberships_gym_id ON memberships(gym_id);
CREATE INDEX idx_memberships_status ON memberships(status);

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TRIGGER: handle_new_user ====================
-- Automatically creates a profile when a new auth user registers

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'athlete'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running migration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
