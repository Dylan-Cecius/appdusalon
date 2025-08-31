-- Corriger les dates des rendez-vous pour avoir des données cohérentes
-- Approche simple sans fonctions de fenêtre

-- D'abord, mettre quelques rendez-vous pour aujourd'hui
WITH recent_appointments AS (
  SELECT id FROM appointments 
  WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
  ORDER BY created_at DESC 
  LIMIT 5
)
UPDATE appointments 
SET 
  start_time = CURRENT_DATE + TIME '09:00:00',
  end_time = CURRENT_DATE + TIME '09:30:00',
  created_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM recent_appointments);

-- Ensuite, mettre d'autres rendez-vous pour hier
WITH yesterday_appointments AS (
  SELECT id FROM appointments 
  WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
    AND start_time < CURRENT_DATE
  ORDER BY created_at DESC 
  LIMIT 8
)
UPDATE appointments 
SET 
  start_time = CURRENT_DATE - INTERVAL '1 day' + TIME '10:00:00',
  end_time = CURRENT_DATE - INTERVAL '1 day' + TIME '10:45:00'
WHERE id IN (SELECT id FROM yesterday_appointments);