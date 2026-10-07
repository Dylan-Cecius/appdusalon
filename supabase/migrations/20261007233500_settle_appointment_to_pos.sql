-- V2: settle an appointment into the canonical POS ledger atomically.

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
  created_transaction public.transactions%ROWTYPE;
  service_item jsonb;
  normalized_items jsonb := '[]'::jsonb;
  quantity_value integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF payment_method_param NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'invalid_payment_method';
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

  IF appointment_record.status = 'cancelled' THEN
    RAISE EXCEPTION 'appointment_cancelled';
  END IF;

  IF appointment_record.is_paid THEN
    RAISE EXCEPTION 'appointment_already_paid'
      USING ERRCODE = '23505';
  END IF;

  IF COALESCE(appointment_record.total_price, 0) <= 0
     OR jsonb_typeof(appointment_record.services) <> 'array'
     OR jsonb_array_length(appointment_record.services) = 0 THEN
    RAISE EXCEPTION 'appointment_not_billable';
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

  INSERT INTO public.transactions (
    items,
    total_amount,
    payment_method,
    user_id,
    salon_id,
    employee_id,
    client_id,
    staff_id,
    transaction_date
  )
  VALUES (
    normalized_items,
    round(appointment_record.total_price::numeric, 2),
    payment_method_param,
    current_user_id,
    salon_id_value,
    employee_id_value,
    matched_client_id,
    appointment_record.staff_id,
    now()
  )
  RETURNING *
  INTO created_transaction;

  UPDATE public.appointments
  SET is_paid = true,
      status = 'completed',
      updated_at = now()
  WHERE id = appointment_record.id;

  RETURN created_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_appointment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_appointment(uuid, text) TO authenticated;
