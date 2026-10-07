-- V2: prevent reintroducing products into the legacy services table.
-- Historical rows may remain inactive for compatibility, but new active rows
-- must use public.products.

CREATE OR REPLACE FUNCTION public.reject_active_product_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.category, '')) = 'produit'
     AND COALESCE(NEW.is_active, true) = true THEN
    RAISE EXCEPTION 'use_products_table_for_retail_items'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_reject_active_product
  ON public.services;

CREATE TRIGGER services_reject_active_product
BEFORE INSERT OR UPDATE OF category, is_active
ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.reject_active_product_service();
