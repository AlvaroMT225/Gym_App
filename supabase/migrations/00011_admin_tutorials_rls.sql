-- ============================================================
-- MIGRATION 00011: ADMIN TUTORIALS RLS
-- Scope: allow admin CRUD on machine_tutorials scoped by gym
-- ============================================================

CREATE POLICY "Admins manage tutorials in gym"
  ON machine_tutorials FOR ALL
  USING (
    is_gym_admin()
    AND EXISTS (
      SELECT 1
      FROM machines m
      WHERE m.id = machine_tutorials.machine_id
        AND m.gym_id = get_user_gym_id()
    )
  )
  WITH CHECK (
    is_gym_admin()
    AND EXISTS (
      SELECT 1
      FROM machines m
      WHERE m.id = machine_tutorials.machine_id
        AND m.gym_id = get_user_gym_id()
    )
  );
