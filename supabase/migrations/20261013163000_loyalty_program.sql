-- V2.2: salon loyalty program with automatic transaction accrual and cancellation reversal.

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  points_per_euro numeric(8,3) NOT NULL DEFAULT 1,
  reward_threshold integer NOT NULL DEFAULT 200,
  reward_value numeric(10,2) NOT NULL DEFAULT 5,
  birthday_bonus integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_programs_points_per_euro_check CHECK (points_per_euro >= 0 AND points_per_euro <= 100),
  CONSTRAINT loyalty_programs_reward_threshold_check CHECK (reward_threshold > 0 AND reward_threshold <= 1000000),
  CONSTRAINT loyalty_programs_reward_value_check CHECK (reward_value >= 0),
  CONSTRAINT loyalty_programs_birthday_bonus_check CHECK (birthday_bonus >= 0)
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view loyalty program" ON public.loyalty_programs;
CREATE POLICY "Salon members can view loyalty program"
ON public.loyalty_programs
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Salon admins can manage loyalty program" ON public.loyalty_programs;
CREATE POLICY "Salon admins can manage loyalty program"
ON public.loyalty_programs
FOR ALL
TO authenticated
USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin'))
WITH CHECK (public.has_role_in_salon(auth.uid(), salon_id, 'admin'));

CREATE TABLE IF NOT EXISTS public.client_loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  lifetime_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_loyalty_account_unique UNIQUE (salon_id, client_id),
  CONSTRAINT client_loyalty_balance_check CHECK (points_balance >= 0),
  CONSTRAINT client_loyalty_earned_check CHECK (lifetime_earned >= 0),
  CONSTRAINT client_loyalty_redeemed_check CHECK (lifetime_redeemed >= 0)
);

ALTER TABLE public.client_loyalty_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view loyalty accounts" ON public.client_loyalty_accounts;
CREATE POLICY "Salon members can view loyalty accounts"
ON public.client_loyalty_accounts
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

REVOKE INSERT, UPDATE, DELETE ON public.client_loyalty_accounts FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES public.client_loyalty_accounts(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  points_delta integer NOT NULL,
  monetary_value numeric(10,2) NOT NULL DEFAULT 0,
  note text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_events_type_check
    CHECK (event_type IN ('earn','redeem','adjust','reversal','birthday')),
  CONSTRAINT loyalty_events_nonzero_check CHECK (points_delta <> 0)
);

CREATE INDEX IF NOT EXISTS loyalty_events_account_history_idx
  ON public.loyalty_events (loyalty_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS loyalty_events_transaction_idx
  ON public.loyalty_events (transaction_id)
  WHERE transaction_id IS NOT NULL;

ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view loyalty events" ON public.loyalty_events;
CREATE POLICY "Salon members can view loyalty events"
ON public.loyalty_events
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

REVOKE INSERT, UPDATE, DELETE ON public.loyalty_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_transaction_loyalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  program_record public.loyalty_programs%ROWTYPE;
  account_record public.client_loyalty_accounts%ROWTYPE;
  earned_points integer;
BEGIN
  IF NEW.client_id IS NULL OR COALESCE(NEW.total_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO program_record
  FROM public.loyalty_programs
  WHERE salon_id = NEW.salon_id
    AND enabled = true;

  IF NOT FOUND OR program_record.points_per_euro <= 0 THEN
    RETURN NEW;
  END IF;

  earned_points := floor(NEW.total_amount * program_record.points_per_euro)::integer;

  IF earned_points <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.client_loyalty_accounts (
    salon_id,
    client_id,
    points_balance,
    lifetime_earned
  )
  VALUES (
    NEW.salon_id,
    NEW.client_id,
    earned_points,
    earned_points
  )
  ON CONFLICT (salon_id, client_id)
  DO UPDATE SET
    points_balance = public.client_loyalty_accounts.points_balance + EXCLUDED.points_balance,
    lifetime_earned = public.client_loyalty_accounts.lifetime_earned + EXCLUDED.lifetime_earned,
    updated_at = now()
  RETURNING *
  INTO account_record;

  INSERT INTO public.loyalty_events (
    loyalty_account_id,
    salon_id,
    client_id,
    transaction_id,
    event_type,
    points_delta,
    monetary_value,
    note,
    created_by_user_id
  )
  VALUES (
    account_record.id,
    NEW.salon_id,
    NEW.client_id,
    NEW.id,
    'earn',
    earned_points,
    0,
    'Points gagnés sur encaissement',
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_transaction_loyalty() FROM PUBLIC;

DROP TRIGGER IF EXISTS transactions_apply_loyalty ON public.transactions;
CREATE TRIGGER transactions_apply_loyalty
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_loyalty();

CREATE OR REPLACE FUNCTION public.reverse_transaction_loyalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_record record;
  account_record public.client_loyalty_accounts%ROWTYPE;
  reverse_points integer;
BEGIN
  IF OLD.client_id IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT COALESCE(sum(points_delta), 0)::integer
  INTO reverse_points
  FROM public.loyalty_events
  WHERE transaction_id = OLD.id
    AND event_type = 'earn'
    AND points_delta > 0;

  IF reverse_points <= 0 THEN
    RETURN OLD;
  END IF;

  SELECT *
  INTO account_record
  FROM public.client_loyalty_accounts
  WHERE salon_id = OLD.salon_id
    AND client_id = OLD.client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  -- Never allow an automatic transaction reversal to create a negative balance.
  reverse_points := LEAST(reverse_points, account_record.points_balance);

  IF reverse_points <= 0 THEN
    RETURN OLD;
  END IF;

  UPDATE public.client_loyalty_accounts
  SET
    points_balance = points_balance - reverse_points,
    lifetime_earned = GREATEST(lifetime_earned - reverse_points, 0),
    updated_at = now()
  WHERE id = account_record.id;

  INSERT INTO public.loyalty_events (
    loyalty_account_id,
    salon_id,
    client_id,
    transaction_id,
    event_type,
    points_delta,
    monetary_value,
    note,
    created_by_user_id
  )
  VALUES (
    account_record.id,
    OLD.salon_id,
    OLD.client_id,
    OLD.id,
    'reversal',
    -reverse_points,
    0,
    'Annulation de l’encaissement',
    auth.uid()
  );

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_transaction_loyalty() FROM PUBLIC;

DROP TRIGGER IF EXISTS transactions_reverse_loyalty ON public.transactions;
CREATE TRIGGER transactions_reverse_loyalty
BEFORE DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.reverse_transaction_loyalty();

CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
  client_id_param uuid,
  points_param integer,
  note_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  program_record public.loyalty_programs%ROWTYPE;
  account_record public.client_loyalty_accounts%ROWTYPE;
  reward_units integer;
  reward_amount numeric(10,2);
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF NOT public.can_access_salon(current_user_id, salon_id_value) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
  INTO program_record
  FROM public.loyalty_programs
  WHERE salon_id = salon_id_value
    AND enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'loyalty_program_disabled';
  END IF;

  IF points_param <= 0
     OR mod(points_param, program_record.reward_threshold) <> 0 THEN
    RAISE EXCEPTION 'invalid_reward_points';
  END IF;

  SELECT *
  INTO account_record
  FROM public.client_loyalty_accounts
  WHERE salon_id = salon_id_value
    AND client_id = client_id_param
  FOR UPDATE;

  IF NOT FOUND OR account_record.points_balance < points_param THEN
    RAISE EXCEPTION 'insufficient_points';
  END IF;

  reward_units := points_param / program_record.reward_threshold;
  reward_amount := round(reward_units * program_record.reward_value, 2);

  UPDATE public.client_loyalty_accounts
  SET
    points_balance = points_balance - points_param,
    lifetime_redeemed = lifetime_redeemed + points_param,
    updated_at = now()
  WHERE id = account_record.id;

  INSERT INTO public.loyalty_events (
    loyalty_account_id,
    salon_id,
    client_id,
    event_type,
    points_delta,
    monetary_value,
    note,
    created_by_user_id
  )
  VALUES (
    account_record.id,
    salon_id_value,
    client_id_param,
    'redeem',
    -points_param,
    reward_amount,
    NULLIF(trim(COALESCE(note_param, '')), ''),
    current_user_id
  );

  RETURN jsonb_build_object(
    'points_redeemed', points_param,
    'reward_amount', reward_amount,
    'points_balance', account_record.points_balance - points_param
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid,integer,text) TO authenticated;
