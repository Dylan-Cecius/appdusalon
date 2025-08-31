-- Corriger complètement la logique de gestion du fuseau horaire
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
  paris_now TIMESTAMPTZ;
  paris_date_with_time TIMESTAMPTZ;
BEGIN
  -- Extraire l'heure et les minutes de time_of_day (format "HH:MM")
  target_hour := EXTRACT(HOUR FROM time_of_day::TIME);
  target_minute := EXTRACT(MINUTE FROM time_of_day::TIME);
  
  -- Obtenir l'heure actuelle à Paris
  paris_now := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris';
  
  CASE frequency_type
    WHEN 'daily' THEN
      -- Créer la date/heure souhaitée aujourd'hui à Paris
      paris_date_with_time := (paris_now::DATE + MAKE_INTERVAL(hours => target_hour, mins => target_minute))::TIMESTAMP AT TIME ZONE 'Europe/Paris';
      
      -- Si l'heure est déjà passée aujourd'hui, prendre demain
      IF paris_date_with_time <= NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris' THEN
        paris_date_with_time := paris_date_with_time + INTERVAL '1 day';
      END IF;
      
      next_date := paris_date_with_time;
      
    WHEN 'weekly' THEN
      -- Calculer le prochain jour de la semaine à Paris
      DECLARE
        days_until_target INTEGER;
        current_dow INTEGER := EXTRACT(DOW FROM paris_now);
        target_dow INTEGER := COALESCE(day_of_week, 1);
        target_date DATE;
      BEGIN
        -- Ajuster pour le système PostgreSQL (0=dimanche, 1=lundi...)
        IF target_dow = 7 THEN target_dow := 0; END IF;
        
        days_until_target := (target_dow - current_dow + 7) % 7;
        target_date := paris_now::DATE + INTERVAL '1 day' * days_until_target;
        
        -- Créer la date/heure complète à Paris
        paris_date_with_time := (target_date + MAKE_INTERVAL(hours => target_hour, mins => target_minute))::TIMESTAMP AT TIME ZONE 'Europe/Paris';
        
        -- Si c'est aujourd'hui mais l'heure est passée, passer à la semaine suivante
        IF target_date = paris_now::DATE AND paris_date_with_time <= NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris' THEN
          paris_date_with_time := paris_date_with_time + INTERVAL '7 days';
        END IF;
        
        next_date := paris_date_with_time;
      END;
      
    WHEN 'monthly' THEN
      -- Calculer le prochain mois au jour spécifié à Paris
      DECLARE
        target_day INTEGER := COALESCE(day_of_month, 1);
        target_date DATE;
      BEGIN
        -- Essayer ce mois d'abord
        target_date := DATE_TRUNC('month', paris_now)::DATE + INTERVAL '1 day' * (target_day - 1);
        
        -- Créer la date/heure complète à Paris
        paris_date_with_time := (target_date + MAKE_INTERVAL(hours => target_hour, mins => target_minute))::TIMESTAMP AT TIME ZONE 'Europe/Paris';
        
        -- Si le jour est passé ce mois ou si l'heure est passée aujourd'hui
        IF target_date < paris_now::DATE OR 
           (target_date = paris_now::DATE AND paris_date_with_time <= NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris') THEN
          -- Passer au mois suivant
          target_date := (DATE_TRUNC('month', paris_now) + INTERVAL '1 month')::DATE + INTERVAL '1 day' * (target_day - 1);
          paris_date_with_time := (target_date + MAKE_INTERVAL(hours => target_hour, mins => target_minute))::TIMESTAMP AT TIME ZONE 'Europe/Paris';
        END IF;
        
        next_date := paris_date_with_time;
      END;
      
    ELSE
      RAISE EXCEPTION 'Type de fréquence invalide: %', frequency_type;
  END CASE;
  
  -- next_date est déjà en UTC car créé avec AT TIME ZONE 'Europe/Paris'
  RETURN next_date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';