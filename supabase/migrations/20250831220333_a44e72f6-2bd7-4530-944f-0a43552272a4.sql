-- Create table for automated report configurations
CREATE TABLE IF NOT EXISTS public.automated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipient_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  report_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- ['revenue', 'appointments', 'stats']
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  time_of_day TIME NOT NULL DEFAULT '09:00:00', -- Heure d'envoi
  day_of_week INTEGER, -- Pour les rapports hebdomadaires (1=Lundi, 7=Dimanche)
  day_of_month INTEGER, -- Pour les rapports mensuels (1-28)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automated_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own automated reports" 
ON public.automated_reports 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to calculate next send date
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
      next_date := date_trunc('day', current_time) + time_of_day;
      IF next_date <= current_time THEN
        next_date := next_date + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      -- Calculer la prochaine occurrence du jour de la semaine spécifié
      next_date := date_trunc('week', current_time) + 
                   INTERVAL '1 day' * (COALESCE(day_of_week, 1) - 1) + 
                   time_of_day;
      IF next_date <= current_time THEN
        next_date := next_date + INTERVAL '1 week';
      END IF;
      
    WHEN 'monthly' THEN
      -- Calculer la prochaine occurrence du jour du mois spécifié
      next_date := date_trunc('month', current_time) + 
                   INTERVAL '1 day' * (COALESCE(day_of_month, 1) - 1) + 
                   time_of_day;
      IF next_date <= current_time THEN
        next_date := date_trunc('month', current_time + INTERVAL '1 month') + 
                     INTERVAL '1 day' * (COALESCE(day_of_month, 1) - 1) + 
                     time_of_day;
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Invalid frequency type: %', frequency_type;
  END CASE;
  
  RETURN next_date;
END;
$$;

-- Create trigger to automatically set next_send_at
CREATE OR REPLACE FUNCTION public.set_next_send_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.next_send_at := calculate_next_send_date(
    NEW.frequency,
    NEW.time_of_day,
    NEW.day_of_week,
    NEW.day_of_month
  );
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_next_send_date
  BEFORE INSERT OR UPDATE ON public.automated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_next_send_date();