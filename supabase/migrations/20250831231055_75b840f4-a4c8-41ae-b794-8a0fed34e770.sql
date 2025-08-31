-- Nettoyer les custom_blocks corrompus avec des heures invalides
DELETE FROM custom_blocks WHERE 
  start_time = '' OR 
  end_time = '' OR 
  start_time IS NULL OR 
  end_time IS NULL OR
  start_time = 'NaN:NaN' OR
  end_time = 'NaN:NaN';