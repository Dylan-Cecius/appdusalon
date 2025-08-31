-- Mettre à jour le compte dylan.cecius@gmail.com avec un accès à vie
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Lifetime',
  subscription_end = '2099-12-31 23:59:59+00'::timestamptz,
  updated_at = now()
WHERE email = 'dylan.cecius@gmail.com';

-- Si le compte n'existe pas encore, l'insérer
INSERT INTO public.subscribers (email, subscribed, subscription_tier, subscription_end)
VALUES ('dylan.cecius@gmail.com', true, 'Lifetime', '2099-12-31 23:59:59+00'::timestamptz)
ON CONFLICT (email) DO UPDATE SET
  subscribed = EXCLUDED.subscribed,
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_end = EXCLUDED.subscription_end,
  updated_at = now();