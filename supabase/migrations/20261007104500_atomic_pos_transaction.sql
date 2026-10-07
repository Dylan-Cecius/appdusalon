-- V2: atomic POS transaction + stock movement.
-- A sale either records both the transaction and stock decrements, or nothing.

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
  product_record public.products%ROWTYPE;
  quantity_value integer;
  new_stock integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF jsonb_typeof(items_param) <> 'array' OR jsonb_array_length(items_param) = 0 THEN
    RAISE EXCEPTION 'cart_empty';
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
    items_param,
    total_amount_param,
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

  FOR item IN
    SELECT value
    FROM jsonb_array_elements(items_param)
  LOOP
    quantity_value := GREATEST(COALESCE((item ->> 'quantity')::integer, 1), 1);

    SELECT *
    INTO product_record
    FROM public.products
    WHERE salon_id = salon_id_value
      AND is_active = true
      AND id::text = item ->> 'id'
    FOR UPDATE;

    IF FOUND THEN
      IF product_record.current_stock < quantity_value THEN
        RAISE EXCEPTION 'insufficient_stock:%:%',
          product_record.name,
          product_record.current_stock;
      END IF;

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
    END IF;
  END LOOP;

  RETURN created_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pos_transaction(jsonb, numeric, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_pos_transaction(jsonb, numeric, text, uuid, uuid) TO authenticated;
