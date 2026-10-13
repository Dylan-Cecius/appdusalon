\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.expect_off_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(expected in SQLERRM)>0 THEN RETURN; END IF; RAISE; END;
  RAISE EXCEPTION 'Expected rejection: %', expected;
END $$;
DO $$
DECLARE
  owner_a uuid := gen_random_uuid(); owner_b uuid := gen_random_uuid(); salon_a uuid; salon_b uuid;
  member_a uuid := gen_random_uuid(); member_b uuid := gen_random_uuid(); service uuid := gen_random_uuid();
  block uuid; appointment uuid; request uuid; tomorrow date := (now() AT TIME ZONE 'Europe/Brussels')::date+1;
  start_at timestamptz; claims text;
BEGIN
  INSERT INTO auth.users(id,email) VALUES(owner_a,owner_a::text||'@timeoff.invalid'),(owner_b,owner_b::text||'@timeoff.invalid');
  SELECT id INTO STRICT salon_a FROM public.salons WHERE owner_user_id=owner_a;
  SELECT id INTO STRICT salon_b FROM public.salons WHERE owner_user_id=owner_b;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules) SELECT member_a,salon_a,'A',jsonb_object_agg(d,jsonb_build_object('start','09:00','end','19:00')) FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d;
  INSERT INTO public.staff(id,salon_id,name) VALUES(member_b,salon_b,'B');
  UPDATE public.opening_hours SET is_open=true,open_time='09:00',close_time='19:00',break_start=NULL,break_end=NULL WHERE salon_id=salon_a;
  INSERT INTO public.services(id,salon_id,user_id,name,price,duration,category,appointment_buffer) VALUES(service,salon_a,owner_a,'Coupe',25,30,'coupe',15);
  start_at := (tomorrow+time '14:00') AT TIME ZONE 'Europe/Brussels';
  INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at) VALUES(salon_a,member_a,'Formation','training',start_at,start_at+interval '1 hour') RETURNING id INTO block;
  PERFORM pg_temp.expect_off_error(format('INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at) VALUES(%L,%L,%L,%L,%L,%L)',salon_a,member_b,'Interdit','leave',start_at,start_at+interval '1 hour'),'invalid_staff');
  PERFORM pg_temp.expect_off_error(format('INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at) VALUES(%L,%L,%L,%L,%L,%L)',salon_a,member_a,'Doublon','leave',start_at,start_at+interval '1 hour'),'time_off_conflict');
  claims := jsonb_build_object('sub',owner_a,'role','authenticated','aal','aal1')::text;
  PERFORM set_config('request.jwt.claims',claims,true);
  request := public.add_staff_waitlist_entry(service,member_a,'Attente','00000000',tomorrow,tomorrow,'09:00','19:00');
  PERFORM pg_temp.expect_off_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',request,member_a,start_at-interval '30 minutes'),'staff_unavailable');
  IF (SELECT status FROM public.booking_waitlist WHERE id=request)<>'active' THEN RAISE EXCEPTION 'Failed booking consumed waitlist request'; END IF;
  appointment := public.book_waitlist_entry(request,member_a,start_at+interval '1 hour');
  PERFORM pg_temp.expect_off_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',start_at,appointment),'staff_unavailable');
  PERFORM pg_temp.expect_off_error(format('UPDATE public.staff_time_off SET ends_at=%L WHERE id=%L',start_at+interval '2 hours',block),'time_off_appointment_conflict');
  DELETE FROM public.staff_time_off WHERE id=block;
  UPDATE public.appointments SET start_time=start_at WHERE id=appointment;
  PERFORM set_config('test.off.salon',salon_a::text,true); PERFORM set_config('test.off.staff',member_a::text,true);
  INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at) VALUES(salon_a,member_a,'Congé','leave',start_at+interval '1 day',start_at+interval '2 days');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','aal','aal1')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_time_off WHERE salon_id=current_setting('test.off.salon')::uuid) THEN RAISE EXCEPTION 'Cross-salon read'; END IF;
  PERFORM pg_temp.expect_off_error(format('INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at) VALUES(%L,%L,%L,%L,now()+interval %L,now()+interval %L)',current_setting('test.off.salon'),current_setting('test.off.staff'),'Interdit','leave','4 days','5 days'),'row-level security');
  RAISE NOTICE 'PASS: time off, canonical duration, waitlist rollback, move conflicts, release and tenant RLS';
END $$;
RESET ROLE;
ROLLBACK;
