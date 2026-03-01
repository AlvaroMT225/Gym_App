-- ============================================================
-- MIGRATION 00006: ADMIN SCHEMA
-- Minthy Training - Payments, promotions, notifications, content, audit
-- ============================================================

-- ==================== TABLE: payments ====================

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id   UUID REFERENCES memberships(id) ON DELETE SET NULL,
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  status          payment_status DEFAULT 'pending',
  method          payment_method,
  reference_code  TEXT,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_profile_id ON payments(profile_id);
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: payment_reminders ====================

CREATE TABLE IF NOT EXISTS payment_reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id  UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  method      TEXT DEFAULT 'push' CHECK (method IN ('email', 'push', 'sms')),
  status      TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered'))
);

CREATE INDEX idx_payment_reminders_payment_id ON payment_reminders(payment_id);

-- ==================== TABLE: promotions ====================

CREATE TABLE IF NOT EXISTS promotions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  discount_type   TEXT DEFAULT 'percentage'
                    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC(6,2) NOT NULL,
  code            TEXT UNIQUE,
  status          promo_status DEFAULT 'active',
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  max_uses        INT,
  uses_count      INT DEFAULT 0,
  min_plan_type   plan_type,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_gym_id ON promotions(gym_id);
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_code ON promotions(code);

-- ==================== TABLE: user_promotions ====================

CREATE TABLE IF NOT EXISTS user_promotions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promotion_id    UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  used_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, promotion_id)
);

CREATE INDEX idx_user_promotions_profile_id ON user_promotions(profile_id);
CREATE INDEX idx_user_promotions_promotion_id ON user_promotions(promotion_id);

-- ==================== TABLE: notifications ====================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX idx_notifications_is_read ON notifications(profile_id, is_read);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);

-- ==================== TABLE: content_items ====================

CREATE TABLE IF NOT EXISTS content_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID REFERENCES gyms(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT,
  content_type    TEXT DEFAULT 'announcement'
                    CHECK (content_type IN ('announcement', 'tip', 'news', 'promotion', 'event')),
  image_url       TEXT,
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_items_gym_id ON content_items(gym_id);
CREATE INDEX idx_content_items_is_published ON content_items(is_published);

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== TABLE: admin_activity_log ====================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id      UUID REFERENCES gyms(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT, -- 'profile', 'membership', 'payment', 'machine', etc.
  entity_id   UUID,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_gym_id ON admin_activity_log(gym_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- ==================== FUNCTION: send_notification ====================

CREATE OR REPLACE FUNCTION send_notification(
  p_profile_id    UUID,
  p_type          notification_type,
  p_title         TEXT,
  p_body          TEXT DEFAULT NULL,
  p_data          JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (p_profile_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== FUNCTION: log_admin_action ====================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id      UUID,
  p_gym_id        UUID,
  p_action        TEXT,
  p_entity_type   TEXT DEFAULT NULL,
  p_entity_id     UUID DEFAULT NULL,
  p_details       JSONB DEFAULT '{}',
  p_ip_address    TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_activity_log (
    admin_id, gym_id, action, entity_type, entity_id, details, ip_address
  ) VALUES (
    p_admin_id, p_gym_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== FUNCTION: increment_promo_uses ====================

CREATE OR REPLACE FUNCTION increment_promo_uses(p_promotion_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promotions
  SET uses_count = uses_count + 1
  WHERE id = p_promotion_id;

  -- Auto-expire if max_uses reached
  UPDATE promotions
  SET status = 'expired'
  WHERE id = p_promotion_id
    AND max_uses IS NOT NULL
    AND uses_count >= max_uses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
