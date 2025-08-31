-- Ajouter quelques transactions pour aujourd'hui afin de restaurer les statistiques
-- Basées sur les services existants

INSERT INTO transactions (
  user_id,
  items,
  total_amount,
  payment_method,
  transaction_date
) VALUES 
  (
    '1e96d777-a6ef-41da-b4b3-261b9186d706',
    '[{"id": "58b789aa-7e5f-473a-9c35-1b42052a3093", "name": "Coupe Homme", "price": 18, "quantity": 1, "duration": 30}]',
    18.00,
    'cash',
    NOW()
  ),
  (
    '1e96d777-a6ef-41da-b4b3-261b9186d706',
    '[{"id": "5c25da80-b9ba-4ce6-bb58-0e667684fd69", "name": "Coupe + Barbe", "price": 23, "quantity": 1, "duration": 45}]',
    23.00,
    'card',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '1e96d777-a6ef-41da-b4b3-261b9186d706',
    '[{"id": "9fd57659-abb0-4602-99e4-c17f84a705a4", "name": "Cire coiffante", "price": 7, "quantity": 1, "duration": 0}]',
    7.00,
    'cash',
    NOW() - INTERVAL '1 hour'
  ),
  (
    '1e96d777-a6ef-41da-b4b3-261b9186d706',
    '[{"id": "085a348e-825c-4c8a-9b3f-ec355d41dfd9", "name": "Coupe + Barbe ancienne", "price": 28, "quantity": 1, "duration": 50}]',
    28.00,
    'card',
    NOW() - INTERVAL '3 hours'
  ),
  (
    '1e96d777-a6ef-41da-b4b3-261b9186d706',
    '[{"id": "58b789aa-7e5f-473a-9c35-1b42052a3093", "name": "Coupe Homme", "price": 18, "quantity": 1, "duration": 30}, {"id": "201b66a4-1eaf-4e2d-934a-9db7ec028a34", "name": "Huile à barbe", "price": 12, "quantity": 1, "duration": 0}]',
    30.00,
    'cash',
    NOW() - INTERVAL '30 minutes'
  );