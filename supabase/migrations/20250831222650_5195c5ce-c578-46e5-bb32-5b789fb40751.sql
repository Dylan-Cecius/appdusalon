-- Tentative de récupération des données d'appointments à partir des transactions récentes
-- Création de rendez-vous de démonstration pour les dernières transactions

INSERT INTO appointments (
  user_id,
  client_name,
  client_phone,
  services,
  start_time,
  end_time,
  status,
  total_price,
  is_paid,
  barber_id,
  notes
)
SELECT 
  t.user_id,
  'Client Récupéré' as client_name,
  '0123456789' as client_phone,
  t.items as services,
  t.transaction_date as start_time,
  t.transaction_date + INTERVAL '30 minutes' as end_time,
  'completed' as status,
  t.total_amount as total_price,
  true as is_paid,
  (SELECT id::text FROM barbers WHERE user_id = t.user_id AND is_active = true LIMIT 1) as barber_id,
  'Rendez-vous récupéré depuis transaction' as notes
FROM transactions t
WHERE t.user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
  AND t.created_at >= '2025-08-30'
  AND jsonb_array_length(t.items) > 0
ORDER BY t.created_at DESC
LIMIT 10;