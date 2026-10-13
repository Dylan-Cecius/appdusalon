-- Dedicated calendar time off. It never creates clients, sales or appointment reminders.
CREATE TABLE public.staff_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
  reason text NOT NULL CHECK (reason IN ('unavailable','break','leave','training')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at - starts_at <= interval '366 days')
);
CREATE INDEX staff_time_off_staff_time_idx ON public.staff_time_off(staff_id, starts_at, ends_at);
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read time off" ON public.staff_time_off FOR SELECT TO authenticated
  USING (public.can_access_salon(auth.uid(), salon_id));
CREATE POLICY "Admins add time off" ON public.staff_time_off FOR INSERT TO authenticated
  WITH CHECK (public.has_role_in_salon(auth.uid(), salon_id, 'admin') AND public.can_access_salon(auth.uid(), salon_id));
CREATE POLICY "Admins update time off" ON public.staff_time_off FOR UPDATE TO authenticated
  USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin') AND public.can_access_salon(auth.uid(), salon_id))
  WITH CHECK (public.has_role_in_salon(auth.uid(), salon_id, 'admin') AND public.can_access_salon(auth.uid(), salon_id));
CREATE POLICY "Admins remove time off" ON public.staff_time_off FOR DELETE TO authenticated
  USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin') AND public.can_access_salon(auth.uid(), salon_id));

CREATE FUNCTION public.validate_staff_time_off() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id=NEW.staff_id AND salon_id=NEW.salon_id AND is_active) THEN RAISE EXCEPTION 'invalid_staff'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.staff_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.staff_time_off t WHERE t.staff_id=NEW.staff_id AND t.id IS DISTINCT FROM NEW.id AND t.starts_at < NEW.ends_at AND t.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'time_off_conflict' USING ERRCODE='23P01';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.staff_id=NEW.staff_id AND a.status NOT IN ('cancelled','no_show') AND a.start_time < NEW.ends_at AND a.end_time > NEW.starts_at) THEN
    RAISE EXCEPTION 'time_off_appointment_conflict' USING ERRCODE='23P01';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER staff_time_off_validate BEFORE INSERT OR UPDATE ON public.staff_time_off FOR EACH ROW EXECUTE FUNCTION public.validate_staff_time_off();

CREATE FUNCTION public.prevent_appointment_during_time_off() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.staff_id IS NULL OR NEW.status IN ('cancelled','no_show') THEN RETURN NEW; END IF;
  -- The same lock is used by segment conflict detection and time-off writes.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.staff_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.staff_time_off t WHERE t.staff_id=NEW.staff_id AND t.starts_at < NEW.end_time AND t.ends_at > NEW.start_time) THEN
    RAISE EXCEPTION 'staff_unavailable' USING ERRCODE='23P01';
  END IF;
  RETURN NEW;
END $$;
-- AFTER observes canonical duration after catalogue normalization, including cleanup.
CREATE TRIGGER appointments_check_time_off AFTER INSERT OR UPDATE OF staff_id,start_time,end_time,status,services ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_during_time_off();
REVOKE ALL ON FUNCTION public.validate_staff_time_off() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_appointment_during_time_off() FROM PUBLIC, anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_time_off;
