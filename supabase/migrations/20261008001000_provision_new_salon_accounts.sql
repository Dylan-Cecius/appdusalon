-- V2: provision a complete salon workspace for normal signups.
-- Employee invitations are explicitly excluded because create-employee attaches them
-- to an existing salon after Supabase creates the auth user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_type text := COALESCE(NEW.raw_user_meta_data ->> 'account_type', '');
  requested_salon_name text :=
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'salon_name', '')), '');
  new_salon_id uuid;
  day_index integer;
BEGIN
  INSERT INTO public.profiles (id, salon_name)
  VALUES (NEW.id, COALESCE(requested_salon_name, 'Mon Salon'))
  ON CONFLICT (id)
  DO UPDATE SET
    salon_name = COALESCE(
      NULLIF(trim(EXCLUDED.salon_name), ''),
      public.profiles.salon_name,
      'Mon Salon'
    ),
    updated_at = now();

  -- Employee accounts are attached to an existing salon by create-employee.
  IF account_type = 'employee' THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO new_salon_id
  FROM public.salons
  WHERE owner_user_id = NEW.id
  ORDER BY created_at
  LIMIT 1;

  IF new_salon_id IS NULL THEN
    INSERT INTO public.salons (
      name,
      owner_user_id
    )
    VALUES (
      COALESCE(requested_salon_name, 'Mon Salon'),
      NEW.id
    )
    RETURNING id INTO new_salon_id;
  END IF;

  INSERT INTO public.user_roles (
    user_id,
    salon_id,
    role
  )
  VALUES (
    NEW.id,
    new_salon_id,
    'admin'
  )
  ON CONFLICT (user_id, salon_id, role) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM public.salon_settings
    WHERE salon_id = new_salon_id
  ) THEN
    INSERT INTO public.salon_settings (
      salon_id,
      user_id,
      name
    )
    VALUES (
      new_salon_id,
      NEW.id,
      COALESCE(requested_salon_name, 'Mon Salon')
    );
  END IF;

  -- Default business hours: Monday-Saturday 09:00-19:00, Sunday closed.
  FOR day_index IN 0..6 LOOP
    INSERT INTO public.opening_hours (
      salon_id,
      day_of_week,
      is_open,
      open_time,
      close_time
    )
    SELECT
      new_salon_id,
      day_index,
      day_index <> 6,
      '09:00',
      '19:00'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.opening_hours
      WHERE salon_id = new_salon_id
        AND day_of_week = day_index
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Repair normal accounts that may have been created while the legacy trigger
-- only inserted a profile and did not provision a salon.
DO $$
DECLARE
  user_record record;
  repaired_salon_id uuid;
  repaired_name text;
  day_index integer;
BEGIN
  FOR user_record IN
    SELECT
      users.id,
      users.raw_user_meta_data
    FROM auth.users users
    WHERE COALESCE(users.raw_user_meta_data ->> 'account_type', '') <> 'employee'
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles roles
        WHERE roles.user_id = users.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.salons salons
        WHERE salons.owner_user_id = users.id
      )
  LOOP
    repaired_name :=
      COALESCE(
        NULLIF(trim(COALESCE(user_record.raw_user_meta_data ->> 'salon_name', '')), ''),
        'Mon Salon'
      );

    INSERT INTO public.profiles (id, salon_name)
    VALUES (user_record.id, repaired_name)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.salons (name, owner_user_id)
    VALUES (repaired_name, user_record.id)
    RETURNING id INTO repaired_salon_id;

    INSERT INTO public.user_roles (user_id, salon_id, role)
    VALUES (user_record.id, repaired_salon_id, 'admin')
    ON CONFLICT (user_id, salon_id, role) DO NOTHING;

    INSERT INTO public.salon_settings (
      salon_id,
      user_id,
      name
    )
    VALUES (
      repaired_salon_id,
      user_record.id,
      repaired_name
    );

    FOR day_index IN 0..6 LOOP
      INSERT INTO public.opening_hours (
        salon_id,
        day_of_week,
        is_open,
        open_time,
        close_time
      )
      VALUES (
        repaired_salon_id,
        day_index,
        day_index <> 6,
        '09:00',
        '19:00'
      );
    END LOOP;
  END LOOP;
END
$$;
