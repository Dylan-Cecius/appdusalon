-- Ajouter la colonne stats_password manquante à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN stats_password TEXT;