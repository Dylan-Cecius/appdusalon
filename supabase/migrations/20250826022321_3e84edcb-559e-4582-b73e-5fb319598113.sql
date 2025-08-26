-- Réactiver les produits qui sont désactivés
UPDATE services 
SET is_active = true, display_order = 10
WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706' 
AND category = 'produit';