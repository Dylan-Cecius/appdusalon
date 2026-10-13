-- V2.1: settle appointments with deposits/prepayments without double-counting revenue.
-- A transaction keeps the full sale amount while transaction_payments records each payment component.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_one_per_appointment_idx
  ON public.transactions (appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'mixed', 'prepaid'));

CREATE TABLE IF NOT EXISTS public.transaction_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL,
  provider text,
  provider_reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_payments_amount_check CHECK (amount > 0),
  CONSTRAINT transaction_payments_method_check
    CHECK (method IN ('cash', 'card', 'stripe_booking'))
);

ALTER TABLE public.transaction_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized members can view transaction payments"
  ON public.transaction_payments;

CREATE POLICY "Authorized members can view transaction payments"
ON public.transaction_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions tx
    WHERE tx.id = transaction_id
      AND (
        public.has_role_in_salon(auth.uid(), tx.salon_id, 'admin')
        OR tx.employee_id = public.get_user_employee_id(auth.uid())
      )
  )
);

REVOKE INSERT, UPDATE, DELETE ON public.transaction_payments
FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS transaction_payments_transaction_idx
  ON public.transaction_payments (transaction_id, paid_at);

CREATE INDEX IF NOT EXISTS transaction_payments_appointment_idx
  ON public.transaction_payments (appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.settle_appointment(
  appointment_id_param uuid,
  payment_method_param text
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  employee_id_value uuid;
  appointment_record public.appointments%ROWTYPE;
  matched_client_id uuid;
  existing_transaction public.transactions%ROWTYPE;
  created_transaction public.transactions%ROWTYPE;
  service_item jsonb;
  normalized_items jsonb := '[]'::jsonb;
  quantity_value integer;
  total_price_value numeric(10,2);
  prepaid_value numeric(10,2);
  remaining_value numeric(10,2);
  transaction_method text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  SELECT *
  INTO appointment_record
  FROM public.appointments
  WHERE id = appointment_id_param
    AND salon_id = salon_id_value
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  SELECT *
  INTO existing_transaction
  FROM public.transactions
  WHERE appointment_id = appointment_record.id
  LIMIT 1;

  IF FOUND THEN
    RETURN existing_transaction;
  END IF;

  IF appointment_record.status = 'cancelled' THEN
    RAISE EXCEPTION 'appointment_cancelled';
  END IF;

  IF appointment_record.status = 'pending_payment' THEN
    RAISE EXCEPTION 'appointment_payment_pending';
  END IF;

  IF appointment_record.is_paid
     AND COALESCE(appointment_record.payment_status, '') <> 'paid' THEN
    RAISE EXCEPTION 'appointment_already_paid'
      USING ERRCODE = '23505';
  END IF;

  IF COALESCE(appointment_record.total_price, 0) <= 0
     OR jsonb_typeof(appointment_record.services) <> 'array'
     OR jsonb_array_length(appointment_record.services) = 0 THEN
    RAISE EXCEPTION 'appointment_not_billable';
  END IF;

  total_price_value := round(appointment_record.total_price::numeric, 2);
  prepaid_value := LEAST(
    total_price_value,
    GREATEST(COALESCE(appointment_record.amount_paid, 0)::numeric, 0)
  );
  remaining_value := GREATEST(total_price_value - prepaid_value, 0);

  IF remaining_value > 0 AND payment_method_param NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  IF appointment_record.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = appointment_record.staff_id
      AND salon_id = salon_id_value
  ) THEN
    RAISE EXCEPTION 'invalid_staff';
  END IF;

  FOR service_item IN
    SELECT value
    FROM jsonb_array_elements(appointment_record.services)
  LOOP
    quantity_value := GREATEST(COALESCE((service_item ->> 'quantity')::integer, 1), 1);

    normalized_items := normalized_items || jsonb_build_array(
      jsonb_build_object(
        'id', service_item ->> 'id',
        'name', COALESCE(service_item ->> 'name', 'Service'),
        'price', COALESCE((service_item ->> 'price')::numeric, 0),
        'quantity', quantity_value,
        'kind', 'service',
        'type', 'service',
        'duration', COALESCE((service_item ->> 'duration')::integer, 0)
      )
    );
  END LOOP;

  SELECT id
  INTO matched_client_id
  FROM public.clients
  WHERE salon_id = salon_id_value
    AND phone = appointment_record.client_phone
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT public.get_user_employee_id(current_user_id)
  INTO employee_id_value;

  transaction_method :=
    CASE
      WHEN prepaid_value > 0 AND remaining_value > 0 THEN 'mixed'
      WHEN prepaid_value > 0 AND remaining_value = 0 THEN 'prepaid'
      ELSE payment_method_param
    END;

  INSERT INTO public.transactions (
    items,
    total_amount,
    payment_method,
    user_id,
    salon_id,
    employee_id,
    client_id,
    staff_id,
    appointment_id,
    transaction_date
  )
  VALUES (
    normalized_items,
    total_price_value,
    transaction_method,
    current_user_id,
    salon_id_value,
    employee_id_value,
    matched_client_id,
    appointment_record.staff_id,
    appointment_record.id,
    now()
  )
  RETURNING *
  INTO created_transaction;

  IF prepaid_value > 0 THEN
    INSERT INTO public.transaction_payments (
      transaction_id,
      appointment_id,
      salon_id,
      amount,
      method,
      provider,
      provider_reference,
      paid_at
    )
    VALUES (
      created_transaction.id,
      appointment_record.id,
      salon_id_value,
      prepaid_value,
      'stripe_booking',
      COALESCE(appointment_record.payment_provider, 'stripe'),
      appointment_record.payment_reference,
      COALESCE(appointment_record.payment_completed_at, now())
    );
  END IF;

  IF remaining_value > 0 THEN
    INSERT INTO public.transaction_payments (
      transaction_id,
      appointment_id,
      salon_id,
      amount,
      method,
      paid_at
    )
    VALUES (
      created_transaction.id,
      appointment_record.id,
      salon_id_value,
      remaining_value,
      payment_method_param,
      now()
    );
  END IF;

  UPDATE public.appointments
  SET
    is_paid = true,
    status = 'completed',
    payment_status = 'paid',
    amount_paid = total_price_value,
    updated_at = now()
  WHERE id = appointment_record.id;

  RETURN created_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_appointment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_appointment(uuid, text) TO authenticated;
