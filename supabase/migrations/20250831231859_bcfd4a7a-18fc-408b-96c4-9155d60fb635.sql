-- Créer ou remplacer la fonction pour calculer la prochaine date d'envoi
CREATE OR REPLACE FUNCTION calculate_next_send_date(
  frequency_type TEXT,
  time_of_day TEXT,
  day_of_week INTEGER DEFAULT NULL,
  day_of_month INTEGER DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_date TIMESTAMPTZ;
  current_time TIMESTAMPTZ := NOW() AT TIME ZONE 'Europe/Paris';
  target_hour INTEGER;
  target_minute INTEGER;
BEGIN
  -- Extraire l'heure et les minutes de time_of_day (format "HH:MM")
  target_hour := EXTRACT(HOUR FROM time_of_day::TIME);
  target_minute := EXTRACT(MINUTE FROM time_of_day::TIME);
  
  CASE frequency_type
    WHEN 'daily' THEN
      -- Pour quotidien, prendre le jour suivant à l'heure spécifiée
      next_date := (current_time::DATE + INTERVAL '1 day')::TIMESTAMPTZ 
                   + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      
    WHEN 'weekly' THEN
      -- Pour hebdomadaire, prendre le prochain jour de la semaine spécifié
      next_date := current_time::DATE + INTERVAL '1 day' * 
                   ((day_of_week - EXTRACT(DOW FROM current_time) + 7) % 7);
      
      -- Si c'est le même jour mais l'heure est passée, prendre la semaine suivante
      IF next_date::DATE = current_time::DATE AND 
         MAKE_TIME(target_hour, target_minute, 0) <= current_time::TIME THEN
        next_date := next_date + INTERVAL '7 days';
      END IF;
      
      next_date := next_date::TIMESTAMPTZ + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      
    WHEN 'monthly' THEN
      -- Pour mensuel, prendre le prochain mois au jour spécifié
      next_date := (DATE_TRUNC('month', current_time) + INTERVAL '1 month' + 
                   INTERVAL '1 day' * (day_of_month - 1))::TIMESTAMPTZ
                   + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      
      -- Si nous sommes déjà passé ce jour ce mois-ci, prendre le mois suivant
      IF EXTRACT(DAY FROM current_time) > day_of_month OR 
         (EXTRACT(DAY FROM current_time) = day_of_month AND 
          MAKE_TIME(target_hour, target_minute, 0) <= current_time::TIME) THEN
        next_date := next_date + INTERVAL '1 month';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Type de fréquence invalide: %', frequency_type;
  END CASE;
  
  -- Convertir en UTC pour le stockage
  RETURN next_date AT TIME ZONE 'Europe/Paris';
END;
$$ LANGUAGE plpgsql;