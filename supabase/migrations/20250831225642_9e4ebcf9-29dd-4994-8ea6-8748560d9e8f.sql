-- Modifier les politiques RLS pour les codes promo
-- Seul l'utilisateur avec l'email dylan.cecius@gmail.com peut gérer les codes promo

DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;

CREATE POLICY "Only Dylan can manage promo codes"
ON public.promo_codes 
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'dylan.cecius@gmail.com'
  )
);

-- Les codes actifs restent visibles par tous pour pouvoir les utiliser
-- La politique existante "Anyone can view active promo codes" reste en place