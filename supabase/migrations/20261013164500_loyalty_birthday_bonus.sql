-- V2.2: idempotent annual loyalty birthday bonus.

ALTER TABLE public.loyalty_events
  ADD COLUMN IF NOT EXISTS reference_key text;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_events_birthday_once_per_year_idx
  ON public.loyalty_events (salon_id, client_id, event_type, reference_key)
  WHERE event_type = 'birthday' AND reference_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.award_loyalty_birthday_bonuses(
  target_date_param date DEFAULT current_date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate record;
  account_record public.client_loyalty_accounts%ROWTYPE;
  inserted_event_id uuid;
  awarded_count integer := 0;
  year_key text := extract(year from target_date_param)::integer::text;
BEGIN
  FOR candidate IN
    SELECT
      clients.id AS client_id,
      clients.salon_id,
      programs.birthday_bonus
    FROM public.clients clients
    JOIN public.loyalty_programs programs
      ON programs.salon_id = clients.salon_id
    WHERE programs.enabled = true
      AND programs.birthday_bonus > 0
      AND clients.birth_date IS NOT NULL
      AND extract(month from clients.birth_date) = extract(month from target_date_param)
      AND extract(day from clients.birth_date) = extract(day from target_date_param)
  LOOP
    INSERT INTO public.client_loyalty_accounts (
      salon_id,
      client_id,
      points_balance,
      lifetime_earned
    )
    VALUES (
      candidate.salon_id,
      candidate.client_id,
      0,
      0
    )
    ON CONFLICT (salon_id, client_id) DO NOTHING;

    SELECT *
    INTO account_record
    FROM public.client_loyalty_accounts
    WHERE salon_id = candidate.salon_id
      AND client_id = candidate.client_id
    FOR UPDATE;

    inserted_event_id := NULL;

    INSERT INTO public.loyalty_events (
      loyalty_account_id,
      salon_id,
      client_id,
      event_type,
      points_delta,
      monetary_value,
      note,
      reference_key
    )
    VALUES (
      account_record.id,
      candidate.salon_id,
      candidate.client_id,
      'birthday',
      candidate.birthday_bonus,
      0,
      'Bonus anniversaire',
      year_key
    )
    ON CONFLICT (salon_id, client_id, event_type, reference_key)
      WHERE event_type = 'birthday' AND reference_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO inserted_event_id;

    IF inserted_event_id IS NOT NULL THEN
      UPDATE public.client_loyalty_accounts
      SET
        points_balance = points_balance + candidate.birthday_bonus,
        lifetime_earned = lifetime_earned + candidate.birthday_bonus,
        updated_at = now()
      WHERE id = account_record.id;

      awarded_count := awarded_count + 1;
    END IF;
  END LOOP;

  RETURN awarded_count;
END;
$$;

REVOKE ALL ON FUNCTION public.award_loyalty_birthday_bonuses(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_loyalty_birthday_bonuses(date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_birthday_bonuses(date) TO service_role;
