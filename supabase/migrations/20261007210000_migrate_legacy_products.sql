-- V2: migrate legacy catalog items stored as services(category='produit')
-- into the canonical products table, then hide the legacy service rows.

INSERT INTO public.products (
  salon_id,
  name,
  description,
  sku,
  category,
  purchase_price,
  sell_price,
  current_stock,
  min_stock,
  unit,
  supplier,
  is_active
)
SELECT
  services.salon_id,
  services.name,
  NULL,
  NULL,
  'autre',
  0,
  services.price,
  0,
  0,
  'unité',
  NULL,
  services.is_active
FROM public.services
WHERE services.category = 'produit'
  AND services.salon_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.salon_id = services.salon_id
      AND lower(trim(products.name)) = lower(trim(services.name))
  );

UPDATE public.services
SET is_active = false,
    updated_at = now()
WHERE category = 'produit'
  AND is_active = true;
