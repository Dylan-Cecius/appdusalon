-- V2.1: recurring appointments created atomically.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_index integer,
  ADD COLUMN IF NOT EXISTS recurrence_frequency text,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer,
  ADD COLUMN IF NOT EXISTS recurrence_total integer;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_recurrence_frequency_check,
  DROP CONSTRAINT IF EXISTS appointments_recurrence_interval_check,
  DROP CONSTRAINT IF EXISTS appointments_recurrence_index_check,
  DROP CONSTRAINT IF EXISTS appointments_recurrence_total_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_recurrence_frequency_check
    CHECK (
      recurrence_frequency IS NULL
      OR recurrence_frequency IN ('weekly', 'monthly')
    ),
  ADD CONSTRAINT appointments_recurrence_interval_check
    CHECK (recurrence_interval IS NULL OR recurrence_interval BETWEEN 1 AND 12),
  ADD CONSTRAINT appointments_recurrence_index_check
    CHECK (recurrence_index IS NULL OR recurrence_index >= 0),
  ADD CONSTRAINT appointments_recurrence_total_check
    CHECK (recurrence_total IS NULL OR recurrence_total BETWEEN 1 AND 52);

CREATE INDEX IF NOT EXISTS appointments_recurrence_group_idx
  ON public.appointments (recurrence_group_id, recurrence_index)
  WHERE recurrence_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_recurring_appointments(
  client_name_param text,
  client_phone_param text,
  services_param jsonb,
  first_start_param timestamptz,
  first_end_param timestamptz,
  staff_id_param uuid,
  notes_param text DEFAULT NULL,
  frequency_param text DEFAULT 'weekly',
  interval_param integer DEFAULT 1,
  occurrences_param integer DEFAULT 2
)
RETURNS SETOF public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  recurrence_id uuid := gen_random_uuid();
  index_value integer;
  occurrence_start timestamptz;
  occurrence_end timestamptz;
  created_row public.appointments%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF frequency_param NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'invalid_recurrence_frequency';
  END IF;

  IF interval_param < 1 OR interval_param > 12 THEN
    RAISE EXCEPTION 'invalid_recurrence_interval';
  END IF;

  IF occurrences_param < 2 OR occurrences_param > 52 THEN
    RAISE EXCEPTION 'invalid_recurrence_occurrences';
  END IF;

  IF first_start_param IS NULL OR first_end_param IS NULL
     OR first_end_param <= first_start_param THEN
    RAISE EXCEPTION 'invalid_recurrence_time';
  END IF;

  IF trim(COALESCE(client_name_param, '')) = '' THEN
    RAISE EXCEPTION 'client_name_required';
  END IF;

  IF staff_id_param IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = staff_id_param
      AND salon_id = salon_id_value
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_staff';
  END IF;

  IF services_param IS NULL OR jsonb_typeof(services_param) <> 'array' THEN
    RAISE EXCEPTION 'invalid_services';
  END IF;

  FOR index_value IN 0..occurrences_param - 1 LOOP
    IF frequency_param = 'monthly' THEN
      occurrence_start :=
        first_start_param + make_interval(months => index_value * interval_param);
      occurrence_end :=
        first_end_param + make_interval(months => index_value * interval_param);
    ELSE
      occurrence_start :=
        first_start_param + make_interval(weeks => index_value * interval_param);
      occurrence_end :=
        first_end_param + make_interval(weeks => index_value * interval_param);
    END IF;

    INSERT INTO public.appointments (
      client_name,
      client_phone,
      services,
      start_time,
      end_time,
      status,
      total_price,
      notes,
      is_paid,
      staff_id,
      user_id,
      salon_id,
      payment_status,
      deposit_required,
      amount_paid,
      recurrence_group_id,
      recurrence_index,
      recurrence_frequency,
      recurrence_interval,
      recurrence_total
    )
    VALUES (
      trim(client_name_param),
      COALESCE(client_phone_param, ''),
      services_param,
      occurrence_start,
      occurrence_end,
      'scheduled',
      0,
      NULLIF(trim(COALESCE(notes_param, '')), ''),
      false,
      staff_id_param,
      current_user_id,
      salon_id_value,
      'unpaid',
      0,
      0,
      recurrence_id,
      index_value,
      frequency_param,
      interval_param,
      occurrences_param
    )
    RETURNING * INTO created_row;

    RETURN NEXT created_row;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recurring_appointments(
  text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_recurring_appointments(
  text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer
) TO authenticated;
