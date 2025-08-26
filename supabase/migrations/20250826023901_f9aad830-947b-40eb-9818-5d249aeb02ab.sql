-- Mettre à jour la catégorie de "Coupe Enfant" pour qu'elle soit dans "coupe"
UPDATE public.services 
SET category = 'coupe' 
WHERE name = 'Coupe Enfant';