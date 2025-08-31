-- Create secure view for appointments without sensitive client data
CREATE OR REPLACE VIEW public.appointments_secure AS
SELECT 
  id,
  barber_id,
  user_id,
  start_time,
  end_time,
  services,
  total_price,
  status,
  is_paid,
  notes,
  created_at,
  updated_at,
  -- Masked client data for security
  CASE 
    WHEN client_name IS NOT NULL THEN 
      LEFT(client_name, 1) || REPEAT('*', GREATEST(LENGTH(client_name)-2, 0)) || RIGHT(client_name, 1)
    ELSE NULL 
  END as client_name_masked,
  CASE 
    WHEN client_phone IS NOT NULL THEN 
      '***-***-' || RIGHT(client_phone, 4)
    ELSE NULL 
  END as client_phone_masked
FROM public.appointments;

-- Apply same RLS policies to the secure view
ALTER VIEW public.appointments_secure SET (security_invoker = true);

-- Create function to get full client details only when needed
CREATE OR REPLACE FUNCTION public.get_appointment_client_details(appointment_id uuid)
RETURNS TABLE(client_name text, client_phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.client_name, a.client_phone 
  FROM public.appointments a
  WHERE a.id = appointment_id 
    AND a.user_id = auth.uid();
$$;