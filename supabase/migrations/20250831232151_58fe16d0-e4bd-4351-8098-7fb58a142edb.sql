-- Corriger la fonction pour bien gérer le fuseau horaire français
CREATE OR REPLACE FUNCTION calculate_next_send_date(
  frequency_type TEXT,
  time_of_day TEXT,
  day_of_week INTEGER DEFAULT NULL,
  day_of_month INTEGER DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_date TIMESTAMPTZ;
  target_hour INTEGER;
  target_minute INTEGER;
  paris_time TIMESTAMPTZ;
BEGIN
  -- Extraire l'heure et les minutes de time_of_day (format "HH:MM")
  target_hour := EXTRACT(HOUR FROM time_of_day::TIME);
  target_minute := EXTRACT(MINUTE FROM time_of_day::TIME);
  
  -- Obtenir l'heure actuelle à Paris
  paris_time := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris';
  
  CASE frequency_type
    WHEN 'daily' THEN
      -- Pour quotidien, prendre le jour suivant à l'heure spécifiée en heure de Paris
      next_date := (paris_time::DATE + INTERVAL '1 day')::TIMESTAMP
                   + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      
      -- Si l'heure n'est pas encore passée aujourd'hui, prendre aujourd'hui
      IF MAKE_TIME(target_hour, target_minute, 0) > paris_time::TIME THEN
        next_date := paris_time::DATE::TIMESTAMP + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      END IF;
      
    WHEN 'weekly' THEN
      -- Pour hebdomadaire, calculer le prochain jour de la semaine à Paris
      DECLARE
        days_until_target INTEGER;
        current_dow INTEGER := EXTRACT(DOW FROM paris_time);
        target_dow INTEGER := COALESCE(day_of_week, 1);
      BEGIN
        -- Ajuster pour le système PostgreSQL (0=dimanche, 1=lundi...)
        IF target_dow = 7 THEN target_dow := 0; END IF;
        
        days_until_target := (target_dow - current_dow + 7) % 7;
        
        -- Si c'est le bon jour mais l'heure est passée, passer à la semaine suivante
        IF days_until_target = 0 AND MAKE_TIME(target_hour, target_minute, 0) <= paris_time::TIME THEN
          days_until_target := 7;
        END IF;
        
        next_date := (paris_time::DATE + INTERVAL '1 day' * days_until_target)::TIMESTAMP
                     + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      END;
      
    WHEN 'monthly' THEN
      -- Pour mensuel, calculer le prochain mois au jour spécifié à Paris
      DECLARE
        target_day INTEGER := COALESCE(day_of_month, 1);
        target_date DATE;
      BEGIN
        -- Essayer ce mois d'abord
        target_date := DATE_TRUNC('month', paris_time)::DATE + INTERVAL '1 day' * (target_day - 1);
        
        -- Si le jour est passé ce mois ou si l'heure est passée aujourd'hui
        IF target_date < paris_time::DATE OR 
           (target_date = paris_time::DATE AND MAKE_TIME(target_hour, target_minute, 0) <= paris_time::TIME) THEN
          -- Passer au mois suivant
          target_date := (DATE_TRUNC('month', paris_time) + INTERVAL '1 month')::DATE + INTERVAL '1 day' * (target_day - 1);
        END IF;
        
        next_date := target_date::TIMESTAMP + MAKE_INTERVAL(hours => target_hour, mins => target_minute);
      END;
      
    ELSE
      RAISE EXCEPTION 'Type de fréquence invalide: %', frequency_type;
  END CASE;
  
  -- Convertir l'heure de Paris vers UTC pour le stockage
  RETURN next_date AT TIME ZONE 'Europe/Paris' AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';