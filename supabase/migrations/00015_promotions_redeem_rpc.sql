CREATE OR REPLACE FUNCTION redeem_promotion(
  p_code TEXT DEFAULT NULL,
  p_promotion_id UUID DEFAULT NULL
)
RETURNS TABLE (
  promotion_id UUID,
  redeemed_at TIMESTAMPTZ,
  uses_count INT
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_gym_id UUID;
  v_promo promotions%ROWTYPE;
  v_code TEXT := NULLIF(BTRIM(p_code), '');
  v_now TIMESTAMPTZ := NOW();
  v_redeemed_at TIMESTAMPTZ;
  v_uses_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED';
  END IF;

  IF v_code IS NULL AND p_promotion_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_IDENTIFIER_REQUIRED';
  END IF;

  SELECT gym_id
  INTO v_user_gym_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_gym_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'PROFILE_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_promo
  FROM promotions
  WHERE (
    p_promotion_id IS NOT NULL
    AND id = p_promotion_id
  ) OR (
    p_promotion_id IS NULL
    AND code = v_code
  )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_NOT_FOUND';
  END IF;

  IF v_promo.gym_id <> v_user_gym_id THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_FORBIDDEN';
  END IF;

  IF v_promo.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_INACTIVE';
  END IF;

  IF v_promo.starts_at IS NOT NULL AND v_promo.starts_at > v_now THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_NOT_STARTED';
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= v_now THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_EXPIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_promotions
    WHERE profile_id = v_user_id
      AND promotion_id = v_promo.id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'PROMO_ALREADY_REDEEMED';
  END IF;

  IF v_promo.max_uses IS NOT NULL AND COALESCE(v_promo.uses_count, 0) >= v_promo.max_uses THEN
    UPDATE promotions
    SET status = 'expired'
    WHERE id = v_promo.id
      AND status = 'active';

    RAISE EXCEPTION USING MESSAGE = 'PROMO_EXHAUSTED';
  END IF;

  INSERT INTO user_promotions (profile_id, promotion_id)
  VALUES (v_user_id, v_promo.id)
  RETURNING used_at INTO v_redeemed_at;

  UPDATE promotions
  SET
    uses_count = COALESCE(uses_count, 0) + 1,
    status = CASE
      WHEN max_uses IS NOT NULL AND COALESCE(uses_count, 0) + 1 >= max_uses THEN 'expired'
      ELSE status
    END
  WHERE id = v_promo.id
  RETURNING promotions.uses_count INTO v_uses_count;

  RETURN QUERY
  SELECT v_promo.id, v_redeemed_at, v_uses_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
