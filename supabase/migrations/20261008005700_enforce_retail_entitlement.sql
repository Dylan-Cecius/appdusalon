-- V2: inventory entitlement also applies to retail sales/read access.
-- Services remain usable on all plans; product operations require Equipe/Lifetime.

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
      IF NOT public.salon_can_manage_inventory(salon_id_value) THEN
        RAISE EXCEPTION 'inventory_upgrade_required'
          USING ERRCODE = '42501';
      END IF;

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

DROP POLICY IF EXISTS "Members can view products in accessible salon" ON public.products;
DROP POLICY IF EXISTS "Members can view stock movements in accessible salon" ON public.stock_movements;

CREATE POLICY "Entitled members can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled members can view stock movements"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.salon_can_manage_inventory(salon_id)
);
