-- Réactiver tous les produits qui ont été supprimés
UPDATE services 
SET is_active = true 
WHERE category = 'produit' AND is_active = false;