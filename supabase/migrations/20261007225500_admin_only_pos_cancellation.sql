-- V2: only salon admins can cancel historical POS transactions.

CREATE OR REPLACE FUNCTION public.delete_pos_transaction(transaction_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  tx public.transactions%ROWTYPE;
  item jsonb;
  product_record public.products%ROWTYPE;
  quantity_value integer;
  new_stock integer;
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
    RAISE EXCEPTION 'admin_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO tx
  FROM public.transactions
  WHERE id = transaction_id_param
    AND salon_id = salon_id_value
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found';
  END IF;

  FOR item IN
    SELECT value
    FROM jsonb_array_elements(tx.items)
  LOOP
    quantity_value := GREATEST(COALESCE((item ->> 'quantity')::integer, 1), 1);

    SELECT *
    INTO product_record
    FROM public.products
    WHERE salon_id = salon_id_value
      AND id::text = item ->> 'id'
    FOR UPDATE;

    IF FOUND THEN
      new_stock := product_record.current_stock + quantity_value;

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
        'in',
        quantity_value,
        product_record.current_stock,
        new_stock,
        'Annulation encaissement — remise en stock',
        current_user_id
      );
    END IF;
  END LOOP;

  DELETE FROM public.transactions
  WHERE id = tx.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_pos_transaction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_pos_transaction(uuid) TO authenticated;
