-- Activer la réplication complète pour les tables avec le temps réel
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;
ALTER TABLE public.promo_code_usage REPLICA IDENTITY FULL;

-- Activer les publications pour le realtime Supabase
-- Ces commandes ajoutent les tables à la publication supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_code_usage;