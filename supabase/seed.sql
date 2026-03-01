-- ============================================================
-- SEED DATA: Minthy Training
-- Gym: Minthy Fitness, Loja, Ecuador
-- ============================================================

-- ==================== GYM ====================

INSERT INTO gyms (id, name, address, city, country, phone, email, timezone) VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Minthy Fitness',
    'Av. Universitaria y Calle Mercadillo, Edificio Centro Comercial Norte',
    'Loja',
    'Ecuador',
    '+593-7-258-0000',
    'info@minthyfitness.ec',
    'America/Guayaquil'
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== GYM SCHEDULES (7 days) ====================

INSERT INTO gym_schedules (gym_id, day_of_week, opens_at, closes_at, is_closed) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 0, NULL,    NULL,    TRUE),  -- Sunday: closed
  ('a1b2c3d4-0001-0001-0001-000000000001', 1, '06:00', '22:00', FALSE), -- Monday
  ('a1b2c3d4-0001-0001-0001-000000000001', 2, '06:00', '22:00', FALSE), -- Tuesday
  ('a1b2c3d4-0001-0001-0001-000000000001', 3, '06:00', '22:00', FALSE), -- Wednesday
  ('a1b2c3d4-0001-0001-0001-000000000001', 4, '06:00', '22:00', FALSE), -- Thursday
  ('a1b2c3d4-0001-0001-0001-000000000001', 5, '06:00', '22:00', FALSE), -- Friday
  ('a1b2c3d4-0001-0001-0001-000000000001', 6, '08:00', '20:00', FALSE)  -- Saturday
ON CONFLICT DO NOTHING;

-- ==================== MACHINES (6) ====================

INSERT INTO machines (id, gym_id, name, description, muscle_groups, equipment_type, status, location) VALUES
  (
    'b1c2d3e4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Banco de Press',
    'Banco plano con soporte para barra. Ideal para press de pecho con barra.',
    ARRAY['chest', 'triceps', 'shoulders']::muscle_group[],
    'free_weight',
    'available',
    'Zona A - Peso Libre'
  ),
  (
    'b1c2d3e4-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Polea Alta (Lat Pulldown)',
    'Máquina de polea alta para jalón al pecho y ejercicios de espalda.',
    ARRAY['back', 'biceps']::muscle_group[],
    'machine',
    'available',
    'Zona B - Máquinas'
  ),
  (
    'b1c2d3e4-0001-0001-0001-000000000003',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Press de Hombros (Shoulder Press)',
    'Máquina para press de hombros con movimiento guiado.',
    ARRAY['shoulders', 'triceps']::muscle_group[],
    'machine',
    'available',
    'Zona B - Máquinas'
  ),
  (
    'b1c2d3e4-0001-0001-0001-000000000004',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Rack de Sentadillas',
    'Rack completo con barra olímpica para sentadillas y press de banca.',
    ARRAY['legs', 'glutes', 'core']::muscle_group[],
    'free_weight',
    'available',
    'Zona A - Peso Libre'
  ),
  (
    'b1c2d3e4-0001-0001-0001-000000000005',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Prensa de Piernas (Leg Press)',
    'Prensa de piernas en ángulo de 45°. Capacidad hasta 400 kg.',
    ARRAY['legs', 'glutes']::muscle_group[],
    'machine',
    'available',
    'Zona C - Piernas'
  ),
  (
    'b1c2d3e4-0001-0001-0001-000000000006',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Polea Cable Funcional',
    'Torre de cable funcional doble con múltiples posiciones de anclaje.',
    ARRAY['full_body']::muscle_group[],
    'cable',
    'available',
    'Zona D - Funcional'
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== EXERCISES (6) ====================

INSERT INTO exercises (id, gym_id, machine_id, name, description, muscle_groups, equipment_type, is_compound, difficulty_level, is_public) VALUES
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000001',
    'Press de Banca con Barra',
    'Ejercicio compuesto para pecho. Tumbado en el banco, baja la barra al pecho y empuja hacia arriba.',
    ARRAY['chest', 'triceps', 'shoulders']::muscle_group[],
    'free_weight',
    TRUE,
    3,
    TRUE
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000002',
    'Jalón al Pecho (Lat Pulldown)',
    'Ejercicio para el dorsal ancho. Tira de la barra hacia el pecho manteniendo el torso erguido.',
    ARRAY['back', 'biceps']::muscle_group[],
    'machine',
    FALSE,
    2,
    TRUE
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000003',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000003',
    'Press de Hombros en Máquina',
    'Press de hombros guiado. Empuja los mangos hacia arriba hasta extensión completa de brazos.',
    ARRAY['shoulders', 'triceps']::muscle_group[],
    'machine',
    FALSE,
    2,
    TRUE
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000004',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000004',
    'Sentadilla con Barra',
    'Ejercicio rey del tren inferior. Baja hasta paralelo o más, manteniendo la espalda recta.',
    ARRAY['legs', 'glutes', 'core']::muscle_group[],
    'free_weight',
    TRUE,
    4,
    TRUE
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000005',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000005',
    'Prensa de Piernas 45°',
    'Ejercicio de piernas en máquina. Empuja la plataforma hasta extensión sin bloquear rodillas.',
    ARRAY['legs', 'glutes']::muscle_group[],
    'machine',
    FALSE,
    2,
    TRUE
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000006',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000006',
    'Curl de Biceps en Cable',
    'Curl de bíceps con polea baja. Mantén los codos fijos a los costados durante el movimiento.',
    ARRAY['biceps']::muscle_group[],
    'cable',
    FALSE,
    1,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== QR CODES (6) ====================

INSERT INTO qr_codes (id, machine_id, code, is_active) VALUES
  ('d1e2f3a4-0001-0001-0001-000000000001', 'b1c2d3e4-0001-0001-0001-000000000001', 'MINTHY-BENCH-001', TRUE),
  ('d1e2f3a4-0001-0001-0001-000000000002', 'b1c2d3e4-0001-0001-0001-000000000002', 'MINTHY-LATPD-001', TRUE),
  ('d1e2f3a4-0001-0001-0001-000000000003', 'b1c2d3e4-0001-0001-0001-000000000003', 'MINTHY-SHLDR-001', TRUE),
  ('d1e2f3a4-0001-0001-0001-000000000004', 'b1c2d3e4-0001-0001-0001-000000000004', 'MINTHY-SQUAT-001', TRUE),
  ('d1e2f3a4-0001-0001-0001-000000000005', 'b1c2d3e4-0001-0001-0001-000000000005', 'MINTHY-LGPRS-001', TRUE),
  ('d1e2f3a4-0001-0001-0001-000000000006', 'b1c2d3e4-0001-0001-0001-000000000006', 'MINTHY-CABLE-001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==================== MACHINE TUTORIALS (2 machines) ====================

-- Bench Press Tutorial
INSERT INTO machine_tutorials (id, machine_id, title, content, difficulty_level, duration_minutes, steps, order_index) VALUES
  (
    'e1f2a3b4-0001-0001-0001-000000000001',
    'b1c2d3e4-0001-0001-0001-000000000001',
    'Press de Banca: Guía para Principiantes',
    'Aprende a realizar el press de banca de forma segura y efectiva. Este tutorial cubre la posición correcta, agarre y técnica de movimiento.',
    1,
    10,
    '[
      {"step": 1, "title": "Posición en el banco", "description": "Recuéstate en el banco con los ojos bajo la barra. Pies planos en el suelo, espalda ligeramente arqueada."},
      {"step": 2, "title": "Agarre de la barra", "description": "Agarra la barra un poco más ancho que los hombros. Los pulgares rodean la barra (agarre completo)."},
      {"step": 3, "title": "Desmontar la barra", "description": "Desbloquea la barra del soporte con los brazos extendidos sobre el pecho."},
      {"step": 4, "title": "Bajar la barra", "description": "Baja la barra de forma controlada hasta tocar el pecho inferior, en 2-3 segundos."},
      {"step": 5, "title": "Empujar", "description": "Empuja la barra explosivamente hacia arriba hasta la extensión completa."},
      {"step": 6, "title": "Volver al soporte", "description": "Después de completar las series, devuelve la barra al soporte con seguridad."}
    ]'::JSONB,
    0
  )
ON CONFLICT (id) DO NOTHING;

-- Lat Pulldown Tutorial
INSERT INTO machine_tutorials (id, machine_id, title, content, difficulty_level, duration_minutes, steps, order_index) VALUES
  (
    'e1f2a3b4-0001-0001-0001-000000000002',
    'b1c2d3e4-0001-0001-0001-000000000002',
    'Jalón al Pecho: Técnica Correcta',
    'Domina el jalón al pecho para desarrollar un dorsal ancho fuerte. Ideal para quienes buscan mejorar la forma en barra.',
    1,
    8,
    '[
      {"step": 1, "title": "Ajustar el asiento", "description": "Ajusta el rodillo para que quede sobre tus muslos. Siéntate con la espalda recta."},
      {"step": 2, "title": "Agarre de la barra", "description": "Agarra la barra con un agarre prono (palmas hacia adelante), más ancho que los hombros."},
      {"step": 3, "title": "Posición inicial", "description": "Inclínate ligeramente hacia atrás (10-15°). Pecho elevado, escápulas deprimidas."},
      {"step": 4, "title": "Jalar la barra", "description": "Tira de la barra hacia el pecho superior, llevando los codos hacia abajo y atrás."},
      {"step": 5, "title": "Contracción", "description": "Mantén 1 segundo en la posición de máxima contracción del dorsal."},
      {"step": 6, "title": "Retorno controlado", "description": "Sube la barra lentamente en 3-4 segundos hasta extensión completa de brazos."}
    ]'::JSONB,
    0
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== WEEKLY CHALLENGES (3) ====================

INSERT INTO challenges (id, gym_id, title, description, start_date, end_date, target_value, target_type, points_reward, is_active) VALUES
  (
    'f1a2b3c4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Reto Semanal: 3 Sesiones',
    'Completa 3 sesiones de entrenamiento esta semana y gana puntos extra.',
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT + 6,
    3,
    'sessions',
    150,
    TRUE
  ),
  (
    'f1a2b3c4-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Rey del Volumen',
    'Acumula 2,000 kg de volumen total esta semana.',
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT + 6,
    2000,
    'volume',
    200,
    TRUE
  ),
  (
    'f1a2b3c4-0001-0001-0001-000000000003',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Racha de Hierro',
    'Mantén una racha de 5 días consecutivos de entrenamiento.',
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INT + 6,
    5,
    'streak',
    300,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== PROMOTIONS (2) ====================

INSERT INTO promotions (id, gym_id, title, description, discount_type, discount_value, code, status, starts_at, expires_at, max_uses) VALUES
  (
    'a2b3c4d5-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Primer Mes Gratis para Nuevos Miembros',
    'Únete a Minthy Fitness y obtén tu primer mes de membresía básica sin costo.',
    'percentage',
    100.00,
    'PRIMERMESGRATIS',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    50
  ),
  (
    'a2b3c4d5-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '20% Descuento en Plan Premium',
    'Actualiza a Premium con un 20% de descuento este mes.',
    'percentage',
    20.00,
    'PREMIUM20',
    'active',
    NOW(),
    NOW() + INTERVAL '15 days',
    30
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== RANKINGS (3) ====================

INSERT INTO rankings (id, gym_id, name, period_type, metric, is_active) VALUES
  (
    'b2c3d4e5-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Ranking Mensual - Sesiones',
    'monthly',
    'sessions',
    TRUE
  ),
  (
    'b2c3d4e5-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Ranking Mensual - Volumen',
    'monthly',
    'volume',
    TRUE
  ),
  (
    'b2c3d4e5-0001-0001-0001-000000000003',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Ranking General - Puntos',
    'all_time',
    'points',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ==================== TEST USER CREATION FUNCTION ====================

CREATE OR REPLACE FUNCTION create_test_user(
  p_email       TEXT,
  p_first_name  TEXT,
  p_last_name   TEXT,
  p_role        user_role DEFAULT 'athlete'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- This function creates a profile record for testing
  -- In production, users are created through auth.users via Supabase Auth
  v_user_id := uuid_generate_v4();

  INSERT INTO profiles (
    id, gym_id, role, first_name, last_name, email, is_active
  ) VALUES (
    v_user_id,
    'a1b2c3d4-0001-0001-0001-000000000001',
    p_role,
    p_first_name,
    p_last_name,
    p_email,
    TRUE
  ) ON CONFLICT (email) DO UPDATE
    SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role;

  -- Create user_stats record
  INSERT INTO user_stats (profile_id)
  VALUES (v_user_id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage (commented out - run manually when needed):
-- SELECT create_test_user('atleta@minthy.test', 'Carlos', 'Pérez', 'athlete');
-- SELECT create_test_user('coach@minthy.test', 'Ana', 'Rodríguez', 'coach');
-- SELECT create_test_user('admin@minthy.test', 'Luis', 'Torres', 'admin');
