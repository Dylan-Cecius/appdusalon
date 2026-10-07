-- V2: provision a salon/admin role for real owner signups.
-- Employee invitations are explicitly excluded: create-employee links those users
-- to an existing salon after the auth invitation is created.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_salon_name text;
  account_type text;
  new_salon_id uuid;
BEGIN
  requested_salon_name := NULLIF(
    trim(
      COALESCE(
        NEW.raw_user_meta_data ->> 'salon_name',
        NEW.raw_user_meta_data ->> 'display_name',
        ''
      )
    ),
    ''
  );

  account_type := lower(COALESCE(NEW.raw_user_meta_data ->> 'account_type', ''));

  INSERT INTO public.profiles (id, salon_name)
  VALUES (NEW.id, COALESCE(requested_salon_name, 'Mon Salon'))
  ON CONFLICT (id)
  DO UPDATE SET
    salon_name = COALESCE(EXCLUDED.salon_name, public.profiles.salon_name),
    updated_at = now();

  -- Invited employee accounts are attached to an existing salon by
  -- the create-employee Edge Function and must not receive their own salon.
  IF account_type = 'employee' THEN
    RETURN NEW;
  END IF;

  -- Idempotency: do not create a second salon if provisioning already happened.
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = NEW.id
  ) OR EXISTS (
    SELECT 1
    FROM public.salons
    WHERE owner_user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.salons (
    owner_user_id,
    name
  )
  VALUES (
    NEW.id,
    COALESCE(requested_salon_name, 'Mon Salon')
  )
  RETURNING id INTO new_salon_id;

  INSERT INTO public.user_roles (
    user_id,
    salon_id,
    role
  )
  VALUES (
    NEW.id,
    new_salon_id,
    'admin'
  );

  RETURN NEW;
END;
$$;

-- Repair owner accounts created after the salon model was introduced but before
-- the provisioning trigger was upgraded. Employee invitations are excluded.
DO $$
DECLARE
  user_record record;
  new_salon_id uuid;
  requested_salon_name text;
BEGIN
  FOR user_record IN
    SELECT
      users.id,
      users.raw_user_meta_data
    FROM auth.users users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles roles
      WHERE roles.user_id = users.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.salons salons
        WHERE salons.owner_user_id = users.id
      )
      AND lower(COALESCE(users.raw_user_meta_data ->> 'account_type', '')) <> 'employee'
  LOOP
    requested_salon_name := NULLIF(
      trim(
        COALESCE(
          user_record.raw_user_meta_data ->> 'salon_name',
          user_record.raw_user_meta_data ->> 'display_name',
          ''
        )
      ),
      ''
    );

    INSERT INTO public.profiles (id, salon_name)
    VALUES (user_record.id, COALESCE(requested_salon_name, 'Mon Salon'))
    ON CONFLICT (id)
    DO NOTHING;

    INSERT INTO public.salons (
      owner_user_id,
      name
    )
    VALUES (
      user_record.id,
      COALESCE(requested_salon_name, 'Mon Salon')
    )
    RETURNING id INTO new_salon_id;

    INSERT INTO public.user_roles (
      user_id,
      salon_id,
      role
    )
    VALUES (
      user_record.id,
      new_salon_id,
      'admin'
    );
  END LOOP;
END
$$;
