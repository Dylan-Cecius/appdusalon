-- Legacy bootstrap data: seed these services only when the historical user
-- actually exists. Fresh V2 databases must remain reproducible without
-- depending on a production-era auth.users row.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid
  ) THEN
    INSERT INTO public.services (name, price, duration, category, user_id) VALUES
      ('Coupe Homme', 25.00, 30, 'coupe', '1e96d777-a6ef-41da-b4b3-261b9186d706'),
      ('Coupe Femme', 35.00, 45, 'coupe', '1e96d777-a6ef-41da-b4b3-261b9186d706'),
      ('Barbe', 15.00, 20, 'barbe', '1e96d777-a6ef-41da-b4b3-261b9186d706'),
      ('Coupe + Barbe', 35.00, 45, 'combo', '1e96d777-a6ef-41da-b4b3-261b9186d706'),
      ('Shampoing Premium', 12.00, 0, 'produit', '1e96d777-a6ef-41da-b4b3-261b9186d706'),
      ('Cire Coiffante', 18.00, 0, 'produit', '1e96d777-a6ef-41da-b4b3-261b9186d706');
  END IF;
END
$$;
