-- ============================================================
-- MIGRATION 00016: TRAINER CONSENT-SCOPED RLS READS
-- Minthy Training - Phase 4 trainer backend RLS hardening
-- ============================================================

-- Coaches can read workout sets only through workout sessions that belong to
-- athletes with active, visible, non-revoked, non-expired progress consent.
DROP POLICY IF EXISTS "Coaches view consented athlete workout sets"
  ON public.workout_sets;

CREATE POLICY "Coaches view consented athlete workout sets"
  ON public.workout_sets
  FOR SELECT
  TO authenticated
  USING (
    is_coach()
    AND EXISTS (
      SELECT 1
      FROM public.workout_sessions ws
      JOIN public.consents c
        ON c.athlete_id = ws.profile_id
      WHERE ws.id = workout_sets.session_id
        AND c.coach_id = auth.uid()
        AND c.status = 'active'
        AND c.revoked_at IS NULL
        AND COALESCE(c.is_hidden_by_athlete, FALSE) = FALSE
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
        AND (
          'view_progress' = ANY(c.scope)
          OR 'full_access' = ANY(c.scope)
        )
    )
  );

-- Coaches can read body weight logs only for athletes with active, visible,
-- non-revoked, non-expired progress consent. The table exists at runtime but is
-- absent from the committed baseline migrations, so guard policy creation.
DO $$
BEGIN
  IF to_regclass('public.body_weight_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Coaches view consented athlete body weight logs" ON public.body_weight_logs';

    EXECUTE $policy$
      CREATE POLICY "Coaches view consented athlete body weight logs"
        ON public.body_weight_logs
        FOR SELECT
        TO authenticated
        USING (
          is_coach()
          AND EXISTS (
            SELECT 1
            FROM public.consents c
            WHERE c.athlete_id = body_weight_logs.profile_id
              AND c.coach_id = auth.uid()
              AND c.status = 'active'
              AND c.revoked_at IS NULL
              AND COALESCE(c.is_hidden_by_athlete, FALSE) = FALSE
              AND (c.expires_at IS NULL OR c.expires_at > NOW())
              AND (
                'view_progress' = ANY(c.scope)
                OR 'full_access' = ANY(c.scope)
              )
          )
        )
    $policy$;
  ELSE
    RAISE NOTICE 'NEEDS_MANUAL_DB_REVIEW: public.body_weight_logs exists in runtime confirmation/API usage but not in committed migrations.';
  END IF;
END $$;

-- Coaches can read routine exercises only through routines that belong to
-- athletes with active, visible, non-revoked, non-expired routine consent.
DROP POLICY IF EXISTS "Coaches view consented athlete routine exercises"
  ON public.routine_exercises;

CREATE POLICY "Coaches view consented athlete routine exercises"
  ON public.routine_exercises
  FOR SELECT
  TO authenticated
  USING (
    is_coach()
    AND EXISTS (
      SELECT 1
      FROM public.routines r
      JOIN public.consents c
        ON c.athlete_id = r.profile_id
      WHERE r.id = routine_exercises.routine_id
        AND c.coach_id = auth.uid()
        AND c.status = 'active'
        AND c.revoked_at IS NULL
        AND COALESCE(c.is_hidden_by_athlete, FALSE) = FALSE
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
        AND (
          'view_routines' = ANY(c.scope)
          OR 'manage_routines' = ANY(c.scope)
          OR 'full_access' = ANY(c.scope)
        )
    )
  );

-- NEEDS_MANUAL_DB_REVIEW:
-- Existing migration 00007 creates coach_clients without WITH
-- (security_invoker = true). Do not alter the view here because the local
-- migrations do not confirm the target Postgres version supports that option.
