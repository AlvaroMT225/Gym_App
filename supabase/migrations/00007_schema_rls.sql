-- ============================================================
-- MIGRATION 00007: ROW LEVEL SECURITY (RLS)
-- Minthy Training - Enable RLS and create policies for all tables
-- ============================================================

-- ==================== ENABLE RLS ON ALL TABLES ====================

ALTER TABLE gyms                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_schedules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships             ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines                ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises               ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_tutorials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tutorial_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines                ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_machines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_calendar_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promotions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log      ENABLE ROW LEVEL SECURITY;

-- ==================== HELPER FUNCTIONS ====================

-- Get the gym_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is an admin/super_admin
CREATE OR REPLACE FUNCTION is_gym_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is a coach
CREATE OR REPLACE FUNCTION is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('coach', 'admin', 'super_admin')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if coach has active consent from athlete
CREATE OR REPLACE FUNCTION has_active_consent(p_athlete_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM consents
    WHERE coach_id = auth.uid()
      AND athlete_id = p_athlete_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is same gym as target profile
CREATE OR REPLACE FUNCTION same_gym_as(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.gym_id = p2.gym_id
    WHERE p1.id = auth.uid() AND p2.id = p_profile_id
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ==================== POLICIES: gyms ====================

CREATE POLICY "Gyms are viewable by members"
  ON gyms FOR SELECT
  USING (id = get_user_gym_id());

CREATE POLICY "Only admins can update gym"
  ON gyms FOR UPDATE
  USING (id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: gym_schedules ====================

CREATE POLICY "Schedules viewable by gym members"
  ON gym_schedules FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Only admins can manage schedules"
  ON gym_schedules FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: profiles ====================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Coaches can view consented athletes"
  ON profiles FOR SELECT
  USING (
    is_coach() AND has_active_consent(id)
  );

CREATE POLICY "Admins can view all profiles in gym"
  ON profiles FOR SELECT
  USING (
    is_gym_admin() AND gym_id = get_user_gym_id()
  );

CREATE POLICY "Admins can manage profiles in gym"
  ON profiles FOR UPDATE
  USING (
    is_gym_admin() AND gym_id = get_user_gym_id()
  );

-- ==================== POLICIES: staff_roles ====================

CREATE POLICY "Admins can manage staff roles"
  ON staff_roles FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

CREATE POLICY "Staff can view own role"
  ON staff_roles FOR SELECT
  USING (profile_id = auth.uid());

-- ==================== POLICIES: memberships ====================

CREATE POLICY "Athletes view own membership"
  ON memberships FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete memberships"
  ON memberships FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id)
  );

CREATE POLICY "Admins manage all memberships in gym"
  ON memberships FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: machines ====================

CREATE POLICY "Machines viewable by gym members"
  ON machines FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Admins can manage machines"
  ON machines FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: exercises ====================

CREATE POLICY "Public exercises viewable by all"
  ON exercises FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Gym exercises viewable by members"
  ON exercises FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Athletes view own exercises"
  ON exercises FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Coaches can manage exercises in gym"
  ON exercises FOR ALL
  USING (
    is_coach() AND (gym_id = get_user_gym_id() OR created_by = auth.uid())
  );

-- ==================== POLICIES: qr_codes ====================

CREATE POLICY "QR codes viewable by gym members"
  ON qr_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM machines m
      WHERE m.id = qr_codes.machine_id AND m.gym_id = get_user_gym_id()
    )
  );

CREATE POLICY "Admins manage QR codes"
  ON qr_codes FOR ALL
  USING (
    is_gym_admin() AND EXISTS (
      SELECT 1 FROM machines m
      WHERE m.id = qr_codes.machine_id AND m.gym_id = get_user_gym_id()
    )
  );

-- ==================== POLICIES: machine_tutorials ====================

CREATE POLICY "Tutorials viewable by gym members"
  ON machine_tutorials FOR SELECT
  USING (
    is_active = TRUE AND EXISTS (
      SELECT 1 FROM machines m
      WHERE m.id = machine_tutorials.machine_id AND m.gym_id = get_user_gym_id()
    )
  );

-- ==================== POLICIES: user_tutorial_progress ====================

CREATE POLICY "Users manage own tutorial progress"
  ON user_tutorial_progress FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete tutorial progress"
  ON user_tutorial_progress FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id)
  );

-- ==================== POLICIES: routines ====================

CREATE POLICY "Athletes view own routines"
  ON routines FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Athletes manage own routines"
  ON routines FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete routines"
  ON routines FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id) AND (
      SELECT 'manage_routines' = ANY(scope) OR 'view_routines' = ANY(scope) OR 'full_access' = ANY(scope)
      FROM consents
      WHERE coach_id = auth.uid() AND athlete_id = profile_id AND status = 'active'
    )
  );

CREATE POLICY "Coaches can manage consented athlete routines"
  ON routines FOR ALL
  USING (
    is_coach() AND has_active_consent(profile_id) AND (
      SELECT 'manage_routines' = ANY(scope) OR 'full_access' = ANY(scope)
      FROM consents
      WHERE coach_id = auth.uid() AND athlete_id = profile_id AND status = 'active'
    )
  );

-- ==================== POLICIES: routine_exercises ====================

CREATE POLICY "Athletes view own routine exercises"
  ON routine_exercises FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM routines r WHERE r.id = routine_exercises.routine_id AND r.profile_id = auth.uid())
  );

CREATE POLICY "Athletes manage own routine exercises"
  ON routine_exercises FOR ALL
  USING (
    EXISTS (SELECT 1 FROM routines r WHERE r.id = routine_exercises.routine_id AND r.profile_id = auth.uid())
  );

-- ==================== POLICIES: workout_sessions ====================

CREATE POLICY "Athletes view own sessions"
  ON workout_sessions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Athletes manage own sessions"
  ON workout_sessions FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete sessions"
  ON workout_sessions FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id) AND (
      SELECT 'view_progress' = ANY(scope) OR 'full_access' = ANY(scope)
      FROM consents
      WHERE coach_id = auth.uid() AND athlete_id = profile_id AND status = 'active'
    )
  );

-- ==================== POLICIES: workout_sets ====================

CREATE POLICY "Athletes view own sets"
  ON workout_sets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = workout_sets.session_id AND ws.profile_id = auth.uid())
  );

CREATE POLICY "Athletes manage own sets"
  ON workout_sets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = workout_sets.session_id AND ws.profile_id = auth.uid())
  );

-- ==================== POLICIES: personal_records ====================

CREATE POLICY "Athletes view own PRs"
  ON personal_records FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete PRs"
  ON personal_records FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id) AND (
      SELECT 'view_personal_records' = ANY(scope) OR 'full_access' = ANY(scope)
      FROM consents
      WHERE coach_id = auth.uid() AND athlete_id = profile_id AND status = 'active'
    )
  );

-- ==================== POLICIES: session_machines ====================

CREATE POLICY "Athletes view own session machines"
  ON session_machines FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_machines.session_id AND ws.profile_id = auth.uid())
  );

CREATE POLICY "Athletes manage own session machines"
  ON session_machines FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = session_machines.session_id AND ws.profile_id = auth.uid())
  );

-- ==================== POLICIES: achievements ====================

CREATE POLICY "Achievements viewable by all authenticated users"
  ON achievements FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ==================== POLICIES: user_achievements ====================

CREATE POLICY "Athletes view own achievements"
  ON user_achievements FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete achievements"
  ON user_achievements FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id) AND (
      SELECT 'view_achievements' = ANY(scope) OR 'full_access' = ANY(scope)
      FROM consents
      WHERE coach_id = auth.uid() AND athlete_id = profile_id AND status = 'active'
    )
  );

-- ==================== POLICIES: challenges ====================

CREATE POLICY "Challenges viewable by gym members"
  ON challenges FOR SELECT
  USING (gym_id = get_user_gym_id() AND is_active = TRUE);

CREATE POLICY "Admins manage challenges"
  ON challenges FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: user_challenges ====================

CREATE POLICY "Athletes manage own challenges"
  ON user_challenges FOR ALL
  USING (profile_id = auth.uid());

-- ==================== POLICIES: rankings ====================

CREATE POLICY "Rankings viewable by gym members"
  ON rankings FOR SELECT
  USING (gym_id = get_user_gym_id());

-- ==================== POLICIES: ranking_entries ====================

CREATE POLICY "Ranking entries viewable by gym members"
  ON ranking_entries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM rankings r WHERE r.id = ranking_entries.ranking_id AND r.gym_id = get_user_gym_id())
  );

-- ==================== POLICIES: points_history ====================

CREATE POLICY "Athletes view own points history"
  ON points_history FOR SELECT
  USING (profile_id = auth.uid());

-- ==================== POLICIES: user_stats ====================

CREATE POLICY "Athletes view own stats"
  ON user_stats FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches view consented athlete stats"
  ON user_stats FOR SELECT
  USING (
    is_coach() AND has_active_consent(profile_id)
  );

CREATE POLICY "Admins view all gym stats"
  ON user_stats FOR SELECT
  USING (
    is_gym_admin() AND same_gym_as(profile_id)
  );

-- ==================== POLICIES: consents ====================

CREATE POLICY "Athletes view own consents"
  ON consents FOR SELECT
  USING (athlete_id = auth.uid() AND is_hidden_by_athlete = FALSE);

CREATE POLICY "Athletes manage own consents"
  ON consents FOR UPDATE
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches view own consents"
  ON consents FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches create consent requests"
  ON consents FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- ==================== POLICIES: client_notes ====================

CREATE POLICY "Coaches manage own client notes"
  ON client_notes FOR ALL
  USING (coach_id = auth.uid());

-- ==================== POLICIES: proposals ====================

CREATE POLICY "Coaches manage own proposals"
  ON proposals FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Athletes view own proposals"
  ON proposals FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes respond to proposals"
  ON proposals FOR UPDATE
  USING (athlete_id = auth.uid());

-- ==================== POLICIES: templates ====================

CREATE POLICY "Coaches manage own templates"
  ON templates FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Public templates viewable by coaches"
  ON templates FOR SELECT
  USING (is_public = TRUE AND is_coach());

-- ==================== POLICIES: template_exercises ====================

CREATE POLICY "Coaches manage own template exercises"
  ON template_exercises FOR ALL
  USING (
    EXISTS (SELECT 1 FROM templates t WHERE t.id = template_exercises.template_id AND t.coach_id = auth.uid())
  );

-- ==================== POLICIES: coach_calendar_events ====================

CREATE POLICY "Coaches manage own calendar"
  ON coach_calendar_events FOR ALL
  USING (coach_id = auth.uid());

-- ==================== POLICIES: coach_alerts ====================

CREATE POLICY "Coaches view own alerts"
  ON coach_alerts FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches update own alerts"
  ON coach_alerts FOR UPDATE
  USING (coach_id = auth.uid());

-- ==================== POLICIES: coach_stats ====================

CREATE POLICY "Coaches view own stats"
  ON coach_stats FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Admins view coach stats in gym"
  ON coach_stats FOR SELECT
  USING (
    is_gym_admin() AND same_gym_as(coach_id)
  );

-- ==================== POLICIES: payments ====================

CREATE POLICY "Athletes view own payments"
  ON payments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins manage all gym payments"
  ON payments FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: payment_reminders ====================

CREATE POLICY "Admins manage payment reminders"
  ON payment_reminders FOR ALL
  USING (
    is_gym_admin() AND EXISTS (
      SELECT 1 FROM payments p WHERE p.id = payment_reminders.payment_id AND p.gym_id = get_user_gym_id()
    )
  );

-- ==================== POLICIES: promotions ====================

CREATE POLICY "Active promotions viewable by gym members"
  ON promotions FOR SELECT
  USING (gym_id = get_user_gym_id() AND status = 'active');

CREATE POLICY "Admins manage promotions"
  ON promotions FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: user_promotions ====================

CREATE POLICY "Athletes view own used promotions"
  ON user_promotions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Athletes use promotions"
  ON user_promotions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ==================== POLICIES: notifications ====================

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid());

-- ==================== POLICIES: content_items ====================

CREATE POLICY "Published content viewable by gym members"
  ON content_items FOR SELECT
  USING (
    (gym_id = get_user_gym_id() OR gym_id IS NULL) AND is_published = TRUE
  );

CREATE POLICY "Admins manage content"
  ON content_items FOR ALL
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== POLICIES: admin_activity_log ====================

CREATE POLICY "Admins view own activity log"
  ON admin_activity_log FOR SELECT
  USING (gym_id = get_user_gym_id() AND is_gym_admin());

-- ==================== VIEWS ====================

-- Athlete dashboard summary view
CREATE OR REPLACE VIEW athlete_dashboard AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.gym_id,
  us.total_sessions,
  us.current_streak,
  us.longest_streak,
  us.total_points,
  us.level,
  us.achievements_count,
  us.last_workout_at,
  m.status         AS membership_status,
  m.plan_type,
  m.end_date       AS membership_end_date
FROM profiles p
LEFT JOIN user_stats us ON us.profile_id = p.id
LEFT JOIN memberships m ON m.profile_id = p.id AND m.status = 'active'
WHERE p.id = auth.uid();

-- Coach clients overview
CREATE OR REPLACE VIEW coach_clients AS
SELECT
  c.id            AS consent_id,
  c.coach_id,
  c.status        AS consent_status,
  c.scope,
  c.expires_at,
  p.id            AS athlete_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.email,
  us.total_sessions,
  us.current_streak,
  us.last_workout_at,
  us.level
FROM consents c
JOIN profiles p ON p.id = c.athlete_id
LEFT JOIN user_stats us ON us.profile_id = p.id
WHERE
  c.coach_id = auth.uid()
  AND c.status = 'active'
  AND (c.expires_at IS NULL OR c.expires_at > NOW());
