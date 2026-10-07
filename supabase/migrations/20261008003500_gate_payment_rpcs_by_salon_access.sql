-- V2: enforce active salon access inside SECURITY DEFINER payment RPCs.

CREATE OR REPLACE FUNCTION public.record_pos_transaction(
  items_param jsonb,
  total_amount_param numeric,
  payment_method_param text,
  client_id_param uuid DEFAULT NULL,
  staff_id_param uuid DEFAULT NULL
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
  created_transaction public.transactions%ROWTYPE;
  item jsonb;
  item_id uuid;
  item_kind text;
  quantity_value integer;
  normalized_items jsonb := '[]'::jsonb;
  calculated_total numeric(12,2) := 0;
  canonical_price numeric(12,2);
  product_record public.products%ROWTYPE;
  service_record public.services%ROWTYPE;
  new_stock integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF jsonb_typeof(items_param) <> 'array'
     OR jsonb_array_length(items_param) = 0
     OR jsonb_array_length(items_param) > 100 THEN
    RAISE EXCEPTION 'invalid_cart';
  END IF;

  IF total_amount_param IS NULL OR total_amount_param < 0 THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;

  IF payment_method_param NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL THEN
    RAISE EXCEPTION 'salon_not_found';
  END IF;

  IF NOT public.can_access_salon(current_user_id, salon_id_value) THEN
    RAISE EXCEPTION 'salon_access_denied'
      USING ERRCODE = '42501';
  END IF;

  IF staff_id_param IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = staff_id_param
      AND salon_id = salon_id_value
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_staff';
  END IF;

  IF client_id_param IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = client_id_param
      AND salon_id = salon_id_value
  ) THEN
    RAISE EXCEPTION 'invalid_client';
  END IF;

  SELECT public.get_user_employee_id(current_user_id)
  INTO employee_id_value;

  FOR item IN
    SELECT value
    FROM jsonb_array_elements(items_param)
  LOOP
    BEGIN
      item_id := (item ->> 'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_item_id';
    END;

    quantity_value := COALESCE((item ->> 'quantity')::integer, 1);
    IF quantity_value < 1 OR quantity_value > 1000 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;

    item_kind := lower(COALESCE(item ->> 'kind', item ->> 'type', 'service'));

    IF item_kind = 'product' THEN
      SELECT *
      INTO product_record
      FROM public.products
      WHERE id = item_id
        AND salon_id = salon_id_value
        AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'product_not_found';
      END IF;

      IF product_record.current_stock < quantity_value THEN
        RAISE EXCEPTION 'insufficient_stock:%:%',
          product_record.name,
          product_record.current_stock;
      END IF;

      canonical_price := round(COALESCE(product_record.sell_price, 0)::numeric, 2);
      calculated_total := calculated_total + canonical_price * quantity_value;

      normalized_items := normalized_items || jsonb_build_array(
        jsonb_build_object(
          'id', product_record.id,
          'name', product_record.name,
          'price', canonical_price,
          'quantity', quantity_value,
          'kind', 'product',
          'type', 'product',
          'duration', 0
        )
      );

      new_stock := product_record.current_stock - quantity_value;

      UPDATE public.products
      SET current_stock = new_stock,
          updated_at = now()
      WHERE id = product_record.id;

      INSERT INTO public.stock_movements (
        salon_id,
        product_id,
        type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        created_by
      )
      VALUES (
        salon_id_value,
        product_record.id,
        'out',
        -quantity_value,
        product_record.current_stock,
        new_stock,
        'Vente POS automatique',
        current_user_id
      );
    ELSE
      SELECT *
      INTO service_record
      FROM public.services
      WHERE id = item_id
        AND salon_id = salon_id_value
        AND is_active = true
        AND lower(COALESCE(category, '')) <> 'produit';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'service_not_found';
      END IF;

      canonical_price := round(COALESCE(service_record.price, 0)::numeric, 2);
      calculated_total := calculated_total + canonical_price * quantity_value;

      normalized_items := normalized_items || jsonb_build_array(
        jsonb_build_object(
          'id', service_record.id,
          'name', service_record.name,
          'price', canonical_price,
          'quantity', quantity_value,
          'kind', 'service',
          'type', 'service',
          'duration', COALESCE(service_record.duration, 0)
        )
      );
    END IF;
  END LOOP;

  calculated_total := round(calculated_total, 2);

  IF abs(calculated_total - round(total_amount_param, 2)) > 0.01 THEN
    RAISE EXCEPTION 'price_changed'
      USING ERRCODE = '22000';
  END IF;

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
    calculated_total,
    payment_method_param,
    current_user_id,
    salon_id_value,
    employee_id_value,
    client_id_param,
    staff_id_param,
    now()
  )
  RETURNING *
  INTO created_transaction;

  RETURN created_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pos_transaction(jsonb, numeric, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_pos_transaction(jsonb, numeric, text, uuid, uuid) TO authenticated;


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

  IF NOT public.can_access_salon(current_user_id, salon_id_value) THEN
    RAISE EXCEPTION 'salon_access_denied'
      USING ERRCODE = '42501';
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

