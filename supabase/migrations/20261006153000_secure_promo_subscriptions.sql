-- V2 subscription tier normalization and secure promo redemption.

UPDATE public.subscribers
SET subscription_tier = CASE
  WHEN subscription_tier = 'Pro' THEN 'Equipe'
  WHEN subscription_tier = 'Enterprise' THEN 'Lifetime'
  ELSE subscription_tier
END
WHERE subscription_tier IN ('Pro', 'Enterprise');

DROP POLICY IF EXISTS "System can insert usage records" ON public.promo_code_usage;
DROP POLICY IF EXISTS "Users can insert their own promo usage" ON public.promo_code_usage;

CREATE POLICY "Users can insert their own promo usage"
ON public.promo_code_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.use_promo_code(code_text TEXT, user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record public.promo_codes%ROWTYPE;
  current_user_id UUID := auth.uid();
  current_email TEXT := auth.jwt() ->> 'email';
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Authentification requise');
  END IF;

  -- Preserve the legacy function signature, but never trust a client-supplied user id.
  IF user_id_param IS DISTINCT FROM current_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur invalide');
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
      AND user_id = current_user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Vous avez déjà utilisé ce code promo');
  END IF;

  IF promo_record.max_uses IS NOT NULL
     AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;

  INSERT INTO public.promo_code_usage (promo_code_id, user_id, subscription_type)
  VALUES (promo_record.id, current_user_id, promo_record.type);

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
      current_user_id,
      current_email,
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
      current_user_id,
      current_email,
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
