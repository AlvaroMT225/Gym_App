-- ============================================================
-- MIGRATION 00008: FIX handle_new_user TRIGGER
-- Extrae full_name del metadata y lo divide en first_name / last_name
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name  TEXT;
  v_first_name TEXT;
  v_last_name  TEXT;
  v_role       user_role;
BEGIN
  -- Extraer full_name del metadata de registro
  v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Dividir en first_name y last_name
  -- Si hay espacio: primer token = first_name, el resto = last_name
  -- Si no hay espacio: todo va a first_name
  IF v_full_name = '' THEN
    v_first_name := NULL;
    v_last_name  := NULL;
  ELSIF POSITION(' ' IN v_full_name) > 0 THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name  := TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1));
  ELSE
    v_first_name := v_full_name;
    v_last_name  := NULL;
  END IF;

  -- Extraer rol del metadata con fallback a 'athlete'
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'athlete'
  );

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (NEW.id, NEW.email, v_first_name, v_last_name, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name  = COALESCE(EXCLUDED.last_name,  profiles.last_name),
    role       = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-crear el trigger (DROP IF EXISTS para idempotencia)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
