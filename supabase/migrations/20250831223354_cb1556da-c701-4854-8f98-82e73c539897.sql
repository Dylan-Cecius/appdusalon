-- Mettre à jour les dates des rendez-vous récupérés pour qu'ils soient répartis sur plusieurs jours
-- et créer des rendez-vous pour aujourd'hui

-- Mettre à jour quelques rendez-vous pour aujourd'hui
UPDATE appointments 
SET 
  start_time = CURRENT_DATE + TIME '09:00:00' + (ROW_NUMBER() OVER (ORDER BY id) - 1) * INTERVAL '2 hours',
  end_time = CURRENT_DATE + TIME '09:30:00' + (ROW_NUMBER() OVER (ORDER BY id) - 1) * INTERVAL '2 hours',
  created_at = CURRENT_TIMESTAMP
WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
  AND id IN (
    SELECT id FROM appointments 
    WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
    ORDER BY created_at DESC 
    LIMIT 5
  );

-- Répartir les autres rendez-vous sur les derniers jours
UPDATE appointments 
SET 
  start_time = CURRENT_DATE - INTERVAL '1 day' + TIME '10:00:00' + (ROW_NUMBER() OVER (ORDER BY id) - 1) * INTERVAL '1 hour',
  end_time = CURRENT_DATE - INTERVAL '1 day' + TIME '10:30:00' + (ROW_NUMBER() OVER (ORDER BY id) - 1) * INTERVAL '1 hour'
WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
  AND start_time < CURRENT_DATE
  AND id NOT IN (
    SELECT id FROM appointments 
    WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'
    AND start_time >= CURRENT_DATE
  );