-- Fix the calculate_next_send_date function with proper type casting
CREATE OR REPLACE FUNCTION public.calculate_next_send_date(
  frequency_type TEXT,
  time_of_day TIME,
  day_of_week INTEGER DEFAULT NULL,
  day_of_month INTEGER DEFAULT NULL
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_date TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      -- Calculer le prochain jour à l'heure spécifiée
      next_date := date_trunc('day', current_time)::timestamp + time_of_day;
      IF next_date <= current_time THEN
        next_date := next_date + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      -- Calculer la prochaine occurrence du jour de la semaine spécifié
      next_date := date_trunc('week', current_time)::timestamp + 
                   INTERVAL '1 day' * (COALESCE(day_of_week, 1) - 1) + 
                   time_of_day;
      IF next_date <= current_time THEN
        next_date := next_date + INTERVAL '1 week';
      END IF;
      
    WHEN 'monthly' THEN
      -- Calculer la prochaine occurrence du jour du mois spécifié
      next_date := date_trunc('month', current_time)::timestamp + 
                   INTERVAL '1 day' * (COALESCE(day_of_month, 1) - 1) + 
                   time_of_day;
      IF next_date <= current_time THEN
        next_date := date_trunc('month', current_time + INTERVAL '1 month')::timestamp + 
                     INTERVAL '1 day' * (COALESCE(day_of_month, 1) - 1) + 
                     time_of_day;
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Invalid frequency type: %', frequency_type;
  END CASE;
  
  RETURN next_date;
END;
$$;