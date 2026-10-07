-- V2: promo redemption belongs to the salon billing owner only.

CREATE OR REPLACE FUNCTION public.use_promo_code(code_text TEXT, user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record public.promo_codes%ROWTYPE;
  current_user_id uuid := auth.uid();
  current_salon_id uuid;
  owner_user_id_value uuid;
  owner_email text;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Authentification requise');
  END IF;

  IF user_id_param IS DISTINCT FROM current_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur invalide');
  END IF;

  current_salon_id := public.get_user_salon_id(current_user_id);

  IF current_salon_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Salon introuvable');
  END IF;

  SELECT owner_user_id
  INTO owner_user_id_value
  FROM public.salons
  WHERE id = current_salon_id;

  IF owner_user_id_value IS NULL OR owner_user_id_value IS DISTINCT FROM current_user_id THEN
    RETURN json_build_object(
      'success',
      false,
      'message',
      'Seul le propriétaire du salon peut utiliser un code promo'
    );
  END IF;

  SELECT lower(email)
  INTO owner_email
  FROM auth.users
  WHERE id = owner_user_id_value;

  IF owner_email IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Email du propriétaire introuvable');
  END IF;

  SELECT *
  INTO promo_record
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(code_text))
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Code promo invalide ou expiré');
  END IF;

  IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'message', 'Ce code promo a expiré');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.promo_code_usage
    WHERE promo_code_id = promo_record.id
      AND user_id = owner_user_id_value
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Vous avez déjà utilisé ce code promo');
  END IF;

  IF promo_record.max_uses IS NOT NULL
     AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;

  INSERT INTO public.promo_code_usage (
    promo_code_id,
    user_id,
    subscription_type
  )
  VALUES (
    promo_record.id,
    owner_user_id_value,
    promo_record.type
  );

  UPDATE public.promo_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = promo_record.id;

  IF promo_record.type = 'trial_month' THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      subscription_end,
      stripe_customer_id,
      updated_at
    )
    VALUES (
      owner_user_id_value,
      owner_email,
      true,
      'Equipe',
      now() + interval '1 month',
      NULL,
      now()
    )
    ON CONFLICT (email)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      subscribed = true,
      subscription_tier = 'Equipe',
      subscription_end = now() + interval '1 month',
      updated_at = now();

  ELSIF promo_record.type = 'lifetime_free' THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      subscription_end,
      stripe_customer_id,
      updated_at
    )
    VALUES (
      owner_user_id_value,
      owner_email,
      true,
      'Lifetime',
      NULL,
      NULL,
      now()
    )
    ON CONFLICT (email)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      subscribed = true,
      subscription_tier = 'Lifetime',
      subscription_end = NULL,
      updated_at = now();
  ELSE
    RAISE EXCEPTION 'Unsupported promo type: %', promo_record.type;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Code promo activé avec succès !',
    'type', promo_record.type,
    'description', promo_record.description,
    'subscription_tier',
      CASE
        WHEN promo_record.type = 'trial_month' THEN 'Equipe'
        ELSE 'Lifetime'
      END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_promo_code(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_promo_code(TEXT, UUID) TO authenticated;
