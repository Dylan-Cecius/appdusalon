-- Staff-assisted waitlist management. No messages or payments are sent here.
ALTER TABLE public.booking_waitlist
  ADD COLUMN IF NOT EXISTS booked_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.add_staff_waitlist_entry(
  service_id_param uuid, staff_id_param uuid, client_name_param text, client_phone_param text,
  date_from_param date, date_to_param date, time_start_param time DEFAULT NULL, time_end_param time DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  salon uuid := public.get_user_salon_id(auth.uid());
  result uuid;
BEGIN
  IF auth.uid() IS NULL OR salon IS NULL OR NOT public.can_access_salon(auth.uid(), salon) THEN
    RAISE EXCEPTION 'salon_access_denied';
  END IF;
  IF char_length(trim(COALESCE(client_name_param, ''))) NOT BETWEEN 2 AND 100
     OR char_length(regexp_replace(COALESCE(client_phone_param, ''), '[^0-9]', '', 'g')) NOT BETWEEN 6 AND 15
     OR char_length(COALESCE(client_phone_param, '')) > 30 THEN
    RAISE EXCEPTION 'invalid_waitlist_client';
  END IF;
  IF date_from_param IS NULL OR date_to_param IS NULL OR date_to_param < date_from_param
     OR date_from_param < (now() AT TIME ZONE 'Europe/Brussels')::date
     OR date_to_param - date_from_param > 30
     OR (time_start_param IS NOT NULL AND time_end_param IS NOT NULL AND time_end_param <= time_start_param) THEN
    RAISE EXCEPTION 'invalid_waitlist_preferences';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id=service_id_param AND salon_id=salon AND is_active AND category <> 'produit') THEN
    RAISE EXCEPTION 'service_not_found';
  END IF;
  IF staff_id_param IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff WHERE id=staff_id_param AND salon_id=salon AND is_active) THEN
    RAISE EXCEPTION 'invalid_staff';
  END IF;
  INSERT INTO public.booking_waitlist(salon_id, service_id, preferred_staff_id, client_name, client_phone,
    preferred_date_from, preferred_date_to, preferred_time_start, preferred_time_end)
  VALUES(salon, service_id_param, staff_id_param, trim(client_name_param), trim(client_phone_param),
    date_from_param, date_to_param, time_start_param, time_end_param) RETURNING id INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_waitlist_entry(entry_id_param uuid, staff_id_param uuid, start_param timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  entry public.booking_waitlist%ROWTYPE;
  service public.services%ROWTYPE;
  member public.staff%ROWTYPE;
  hours public.opening_hours%ROWTYPE;
  created public.appointments%ROWTYPE;
  minutes integer;
  local_start timestamp;
  local_end timestamp;
  day_name text;
  work jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO entry FROM public.booking_waitlist
    WHERE id=entry_id_param AND public.can_access_salon(auth.uid(), salon_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'waitlist_access_denied'; END IF;
  IF entry.status='booked' AND entry.booked_appointment_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.appointments WHERE id=entry.booked_appointment_id AND staff_id=staff_id_param AND start_time=start_param) THEN
      RETURN entry.booked_appointment_id;
    END IF;
  END IF;
  IF entry.status NOT IN ('active', 'notified') THEN RAISE EXCEPTION 'waitlist_already_processed'; END IF;
  IF start_param IS NULL OR start_param <= now() THEN RAISE EXCEPTION 'invalid_waitlist_slot'; END IF;
  IF entry.preferred_staff_id IS NOT NULL AND entry.preferred_staff_id IS DISTINCT FROM staff_id_param THEN
    RAISE EXCEPTION 'invalid_waitlist_slot';
  END IF;
  SELECT * INTO service FROM public.services WHERE id=entry.service_id AND salon_id=entry.salon_id AND is_active AND category <> 'produit' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_not_found'; END IF;
  SELECT * INTO member FROM public.staff WHERE id=staff_id_param AND salon_id=entry.salon_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_staff'; END IF;
  SELECT COALESCE(sum(duration_minutes), service.duration)::integer + GREATEST(COALESCE(service.appointment_buffer, 0), 0)
    INTO minutes FROM public.service_steps WHERE service_id=service.id;
  IF minutes IS NULL OR minutes <= 0 THEN RAISE EXCEPTION 'invalid_service_duration'; END IF;
  local_start := start_param AT TIME ZONE 'Europe/Brussels';
  local_end := (start_param + make_interval(mins=>minutes)) AT TIME ZONE 'Europe/Brussels';
  IF local_start::date < entry.preferred_date_from OR local_start::date > entry.preferred_date_to
     OR local_end::date <> local_start::date
     OR (entry.preferred_time_start IS NOT NULL AND local_start::time < entry.preferred_time_start)
     OR (entry.preferred_time_end IS NOT NULL AND local_end::time > entry.preferred_time_end) THEN
    RAISE EXCEPTION 'invalid_waitlist_slot';
  END IF;
  SELECT * INTO hours FROM public.opening_hours
    WHERE salon_id=entry.salon_id AND day_of_week=extract(isodow FROM local_start)::integer-1 FOR SHARE;
  IF NOT FOUND OR NOT hours.is_open OR local_start::time < hours.open_time OR local_end::time > hours.close_time
     OR (hours.break_start IS NOT NULL AND hours.break_end IS NOT NULL AND local_start::time < hours.break_end AND local_end::time > hours.break_start) THEN
    RAISE EXCEPTION 'outside_opening_hours';
  END IF;
  day_name := (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[extract(isodow FROM local_start)::integer];
  work := member.daily_schedules -> day_name;
  IF work IS NULL OR work->>'start' IS NULL OR work->>'end' IS NULL
     OR local_start::time < (work->>'start')::time OR local_end::time > (work->>'end')::time THEN
    RAISE EXCEPTION 'outside_staff_hours';
  END IF;
  -- Catalogue normalization and segment-overlap triggers remain authoritative.
  -- Any insert failure rolls back the whole operation and leaves the entry active.
  INSERT INTO public.appointments(client_name, client_phone, services, start_time, end_time, status,
    total_price, is_paid, staff_id, user_id, salon_id, payment_status, amount_paid, deposit_required)
  VALUES(entry.client_name, entry.client_phone, jsonb_build_array(jsonb_build_object('id', service.id)),
    start_param, start_param + make_interval(mins=>minutes), 'scheduled', 0, false, member.id, auth.uid(), entry.salon_id, 'unpaid', 0, 0)
  RETURNING * INTO created;
  UPDATE public.booking_waitlist SET status='booked', booked_appointment_id=created.id, offer_expires_at=NULL WHERE id=entry.id;
  RETURN created.id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_staff_waitlist_entry(uuid,uuid,text,text,date,date,time,time) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_waitlist_entry(uuid,uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_staff_waitlist_entry(uuid,uuid,text,text,date,date,time,time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_waitlist_entry(uuid,uuid,timestamptz) TO authenticated;
