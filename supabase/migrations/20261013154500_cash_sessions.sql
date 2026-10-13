-- V2.1: cash register sessions, cash movements and Z-style closing summary.

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  opened_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_float numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  closed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  counted_cash numeric(10,2),
  theoretical_cash numeric(10,2),
  cash_difference numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_sessions_status_check CHECK (status IN ('open','closed')),
  CONSTRAINT cash_sessions_opening_float_check CHECK (opening_float >= 0),
  CONSTRAINT cash_sessions_counted_cash_check CHECK (counted_cash IS NULL OR counted_cash >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_salon_idx
  ON public.cash_sessions (salon_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS cash_sessions_history_idx
  ON public.cash_sessions (salon_id, opened_at DESC);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view cash sessions" ON public.cash_sessions;
CREATE POLICY "Salon members can view cash sessions"
ON public.cash_sessions
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

REVOKE INSERT, UPDATE, DELETE ON public.cash_sessions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  movement_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_movements_type_check CHECK (movement_type IN ('deposit','withdrawal')),
  CONSTRAINT cash_movements_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS cash_movements_session_idx
  ON public.cash_movements (cash_session_id, created_at);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view cash movements" ON public.cash_movements;
CREATE POLICY "Salon members can view cash movements"
ON public.cash_movements
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

REVOKE INSERT, UPDATE, DELETE ON public.cash_movements FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.open_cash_session(
  opening_float_param numeric DEFAULT 0,
  notes_param text DEFAULT NULL
)
RETURNS public.cash_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  created_session public.cash_sessions%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF NOT public.has_role_in_salon(current_user_id, salon_id_value, 'admin') THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF COALESCE(opening_float_param, 0) < 0 THEN
    RAISE EXCEPTION 'invalid_opening_float';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cash_sessions
    WHERE salon_id = salon_id_value
      AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'cash_session_already_open';
  END IF;

  INSERT INTO public.cash_sessions (
    salon_id,
    opened_by_user_id,
    opening_float,
    notes
  )
  VALUES (
    salon_id_value,
    current_user_id,
    round(COALESCE(opening_float_param,0)::numeric,2),
    NULLIF(trim(COALESCE(notes_param,'')), '')
  )
  RETURNING * INTO created_session;

  RETURN created_session;
END;
$$;

REVOKE ALL ON FUNCTION public.open_cash_session(numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_cash_session(numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_cash_movement(
  movement_type_param text,
  amount_param numeric,
  reason_param text DEFAULT NULL
)
RETURNS public.cash_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  session_record public.cash_sessions%ROWTYPE;
  created_movement public.cash_movements%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF movement_type_param NOT IN ('deposit','withdrawal') THEN
    RAISE EXCEPTION 'invalid_movement_type';
  END IF;

  IF COALESCE(amount_param,0) <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT *
  INTO session_record
  FROM public.cash_sessions
  WHERE salon_id = salon_id_value
    AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cash_session_not_open';
  END IF;

  INSERT INTO public.cash_movements (
    cash_session_id,
    salon_id,
    created_by_user_id,
    movement_type,
    amount,
    reason
  )
  VALUES (
    session_record.id,
    salon_id_value,
    current_user_id,
    movement_type_param,
    round(amount_param::numeric,2),
    NULLIF(trim(COALESCE(reason_param,'')), '')
  )
  RETURNING * INTO created_movement;

  RETURN created_movement;
END;
$$;

REVOKE ALL ON FUNCTION public.record_cash_movement(text,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_cash_movement(text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_cash_session(
  counted_cash_param numeric,
  notes_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  session_record public.cash_sessions%ROWTYPE;
  cash_sales numeric(12,2) := 0;
  cash_deposits numeric(12,2) := 0;
  cash_withdrawals numeric(12,2) := 0;
  theoretical_value numeric(12,2) := 0;
  difference_value numeric(12,2) := 0;
  total_sales numeric(12,2) := 0;
  card_sales numeric(12,2) := 0;
  mixed_sales numeric(12,2) := 0;
  transaction_count integer := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF NOT public.has_role_in_salon(current_user_id, salon_id_value, 'admin') THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF counted_cash_param IS NULL OR counted_cash_param < 0 THEN
    RAISE EXCEPTION 'invalid_counted_cash';
  END IF;

  SELECT *
  INTO session_record
  FROM public.cash_sessions
  WHERE salon_id = salon_id_value
    AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cash_session_not_open';
  END IF;

  SELECT
    COALESCE(sum(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END),0),
    COALESCE(sum(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END),0),
    COALESCE(sum(CASE WHEN payment_method = 'mixed' THEN total_amount ELSE 0 END),0),
    COALESCE(sum(total_amount),0),
    count(*)
  INTO
    cash_sales,
    card_sales,
    mixed_sales,
    total_sales,
    transaction_count
  FROM public.transactions
  WHERE salon_id = salon_id_value
    AND transaction_date >= session_record.opened_at
    AND transaction_date <= now();

  -- For mixed transactions, use their payment ledger to count only cash components.
  SELECT cash_sales + COALESCE(sum(tp.amount),0)
  INTO cash_sales
  FROM public.transaction_payments tp
  JOIN public.transactions tx ON tx.id = tp.transaction_id
  WHERE tx.salon_id = salon_id_value
    AND tx.transaction_date >= session_record.opened_at
    AND tx.transaction_date <= now()
    AND tx.payment_method = 'mixed'
    AND tp.method = 'cash';

  SELECT
    COALESCE(sum(CASE WHEN movement_type = 'deposit' THEN amount ELSE 0 END),0),
    COALESCE(sum(CASE WHEN movement_type = 'withdrawal' THEN amount ELSE 0 END),0)
  INTO cash_deposits, cash_withdrawals
  FROM public.cash_movements
  WHERE cash_session_id = session_record.id;

  theoretical_value :=
    round(session_record.opening_float + cash_sales + cash_deposits - cash_withdrawals, 2);
  difference_value := round(counted_cash_param - theoretical_value, 2);

  UPDATE public.cash_sessions
  SET
    status = 'closed',
    closed_by_user_id = current_user_id,
    closed_at = now(),
    counted_cash = round(counted_cash_param::numeric,2),
    theoretical_cash = theoretical_value,
    cash_difference = difference_value,
    notes = COALESCE(NULLIF(trim(COALESCE(notes_param,'')), ''), notes),
    updated_at = now()
  WHERE id = session_record.id;

  RETURN jsonb_build_object(
    'session_id', session_record.id,
    'opened_at', session_record.opened_at,
    'closed_at', now(),
    'opening_float', session_record.opening_float,
    'cash_sales', cash_sales,
    'card_sales', card_sales,
    'mixed_sales', mixed_sales,
    'cash_deposits', cash_deposits,
    'cash_withdrawals', cash_withdrawals,
    'theoretical_cash', theoretical_value,
    'counted_cash', round(counted_cash_param::numeric,2),
    'cash_difference', difference_value,
    'total_sales', total_sales,
    'transaction_count', transaction_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.close_cash_session(numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_cash_session(numeric,text) TO authenticated;
