-- ============================================================
-- MIGRATION 00010: FIX ADMIN RLS FOR D4/D5
-- Scope: admin access for session_machines usage stats and user_promotions admin ops
-- ============================================================

-- ==================== POLICIES: session_machines ====================

CREATE POLICY "Admins view gym session machines"
  ON session_machines FOR SELECT
  USING (
    is_gym_admin()
    AND EXISTS (
      SELECT 1
      FROM machines m
      WHERE m.id = session_machines.machine_id
        AND m.gym_id = get_user_gym_id()
    )
    AND EXISTS (
      SELECT 1
      FROM workout_sessions ws
      WHERE ws.id = session_machines.session_id
        AND ws.gym_id = get_user_gym_id()
    )
  );

-- ==================== POLICIES: user_promotions ====================

CREATE POLICY "Admins manage gym user promotions"
  ON user_promotions FOR ALL
  USING (
    is_gym_admin()
    AND EXISTS (
      SELECT 1
      FROM promotions p
      WHERE p.id = user_promotions.promotion_id
        AND p.gym_id = get_user_gym_id()
    )
    AND EXISTS (
      SELECT 1
      FROM profiles pr
      WHERE pr.id = user_promotions.profile_id
        AND pr.gym_id = get_user_gym_id()
    )
  )
  WITH CHECK (
    is_gym_admin()
    AND EXISTS (
      SELECT 1
      FROM promotions p
      WHERE p.id = user_promotions.promotion_id
        AND p.gym_id = get_user_gym_id()
    )
    AND EXISTS (
      SELECT 1
      FROM profiles pr
      WHERE pr.id = user_promotions.profile_id
        AND pr.gym_id = get_user_gym_id()
    )
  );
