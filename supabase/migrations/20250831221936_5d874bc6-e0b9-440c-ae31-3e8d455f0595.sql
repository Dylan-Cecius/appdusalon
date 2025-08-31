-- Completely rewrite the calculate_next_send_date function with proper type handling
DROP FUNCTION IF EXISTS public.calculate_next_send_date(TEXT, TIME, INTEGER, INTEGER);

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
  current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
  today_date DATE := CURRENT_DATE;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      -- Combine today's date with the specified time
      next_date := (today_date + time_of_day)::TIMESTAMP WITH TIME ZONE;
      
      -- If that time has already passed today, move to tomorrow
      IF next_date <= current_timestamp THEN
        next_date := ((today_date + INTERVAL '1 day') + time_of_day)::TIMESTAMP WITH TIME ZONE;
      END IF;
      
    WHEN 'weekly' THEN
      -- Calculate the next occurrence of the specified day of week
      DECLARE
        days_until_target INTEGER;
        current_dow INTEGER := EXTRACT(DOW FROM today_date); -- 0=Sunday, 1=Monday, etc.
        target_dow INTEGER := COALESCE(day_of_week, 1); -- Default to Monday if not specified
      BEGIN
        -- Convert to PostgreSQL's day numbering (0=Sunday) if needed
        -- Assuming day_of_week is 1=Monday, 2=Tuesday, etc.
        target_dow := CASE 
          WHEN target_dow = 7 THEN 0  -- Sunday
          ELSE target_dow
        END;
        
        days_until_target := target_dow - current_dow;
        
        -- If target day is today but time has passed, or target day is in the past
        IF days_until_target < 0 OR (days_until_target = 0 AND (today_date + time_of_day)::TIMESTAMP WITH TIME ZONE <= current_timestamp) THEN
          days_until_target := days_until_target + 7;
        END IF;
        
        next_date := ((today_date + INTERVAL '1 day' * days_until_target) + time_of_day)::TIMESTAMP WITH TIME ZONE;
      END;
      
    WHEN 'monthly' THEN
      -- Calculate the next occurrence of the specified day of month
      DECLARE
        target_day INTEGER := COALESCE(day_of_month, 1);
        target_date DATE;
        current_day INTEGER := EXTRACT(DAY FROM today_date);
      BEGIN
        -- Try this month first
        target_date := DATE_TRUNC('month', today_date)::DATE + INTERVAL '1 day' * (target_day - 1);
        
        -- If the target day doesn't exist this month or has passed
        IF target_day > EXTRACT(DAY FROM (DATE_TRUNC('month', today_date) + INTERVAL '1 month - 1 day')::DATE) 
           OR target_date < today_date 
           OR (target_date = today_date AND (today_date + time_of_day)::TIMESTAMP WITH TIME ZONE <= current_timestamp) THEN
          
          -- Move to next month
          target_date := (DATE_TRUNC('month', today_date) + INTERVAL '1 month')::DATE + INTERVAL '1 day' * (target_day - 1);
          
          -- Handle case where target day doesn't exist in next month
          DECLARE
            last_day_next_month INTEGER := EXTRACT(DAY FROM (DATE_TRUNC('month', today_date) + INTERVAL '2 month - 1 day')::DATE);
          BEGIN
            IF target_day > last_day_next_month THEN
              target_date := (DATE_TRUNC('month', today_date) + INTERVAL '2 month - 1 day')::DATE;
            END IF;
          END;
        END IF;
        
        next_date := (target_date + time_of_day)::TIMESTAMP WITH TIME ZONE;
      END;
      
    ELSE
      RAISE EXCEPTION 'Invalid frequency type: %. Must be daily, weekly, or monthly', frequency_type;
  END CASE;
  
  RETURN next_date;
END;
$$;