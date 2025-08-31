-- Nettoyer les données orphelines dans lunch_breaks
-- Supprimer la pause déjeuner sans user_id qui peut causer des problèmes
DELETE FROM lunch_breaks WHERE user_id IS NULL;