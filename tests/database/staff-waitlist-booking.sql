\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF position(expected in SQLERRM) > 0 THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected rejection: %', expected;
END $$;

DO $$
DECLARE
  owner_a uuid := gen_random_uuid(); owner_b uuid := gen_random_uuid();
  salon_a uuid; salon_b uuid; member_a uuid := gen_random_uuid(); member_b uuid := gen_random_uuid();
  cut uuid := gen_random_uuid(); color uuid := gen_random_uuid(); foreign_service uuid := gen_random_uuid();
  request_a uuid; request_b uuid; result_a uuid; repeated uuid; flexible uuid;
  day date := (now() AT TIME ZONE 'Europe/Brussels')::date + 1;
  pose timestamptz; claims text;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
    (owner_a, owner_a::text || '@waitlist.invalid', '{"salon_name":"Waitlist A"}'),
    (owner_b, owner_b::text || '@waitlist.invalid', '{"salon_name":"Waitlist B"}');
  SELECT id INTO STRICT salon_a FROM public.salons WHERE owner_user_id=owner_a;
  SELECT id INTO STRICT salon_b FROM public.salons WHERE owner_user_id=owner_b;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules)
  SELECT member_a,salon_a,'Test A',jsonb_object_agg(d, jsonb_build_object('start','09:00','end','19:00'))
    FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules) SELECT member_b,salon_b,'Test B',daily_schedules FROM public.staff WHERE id=member_a;
  PERFORM pg_temp.expect_error(format('INSERT INTO public.staff(salon_id,name) VALUES(%L,%L)',salon_a,'Au-delà du forfait'), 'staff_plan_limit_reached:1');
  INSERT INTO public.opening_hours(salon_id,day_of_week,is_open,open_time,close_time,break_start,break_end)
    SELECT salon_a,d,true,'09:00'::time,'19:00'::time,'12:00'::time,'13:00'::time FROM generate_series(0,6) d
    ON CONFLICT(salon_id,day_of_week) DO UPDATE SET is_open=true,open_time='09:00',close_time='19:00',break_start='12:00',break_end='13:00';
  INSERT INTO public.services(id,salon_id,user_id,name,price,duration,category) VALUES
    (cut,salon_a,owner_a,'Coupe',25,30,'coupe'),(color,salon_a,owner_a,'Coloration',75,90,'coupe'),
    (foreign_service,salon_b,owner_b,'Autre salon',25,30,'coupe');
  INSERT INTO public.service_steps(service_id,salon_id,position,name,step_type,duration_minutes) VALUES
    (color,salon_a,0,'Application','work',30),(color,salon_a,1,'Pose','pause',30),(color,salon_a,2,'Rinçage','work',30);
  claims := jsonb_build_object('sub',owner_a,'role','authenticated','aal','aal1')::text;
  PERFORM set_config('request.jwt.claims',claims,true);
  pose := (day + time '09:30') AT TIME ZONE 'Europe/Brussels';
  INSERT INTO public.appointments(client_name,client_phone,services,start_time,end_time,status,total_price,is_paid,staff_id,user_id,salon_id)
    VALUES('Coloration existante','00000000',jsonb_build_array(jsonb_build_object('id',color)),pose-interval '30 minutes',pose+interval '60 minutes','scheduled',75,false,member_a,owner_a,salon_a);
  request_a := public.add_staff_waitlist_entry(cut,member_a,'Client test','00000000',day,day,'09:30','10:00');
  request_b := public.add_staff_waitlist_entry(cut,member_a,'Conflit test','00000000',day,day,'09:30','10:00');
  PERFORM pg_temp.expect_error(format('SELECT public.add_staff_waitlist_entry(%L,NULL,%L,%L,%L,%L)',foreign_service,'Interdit','00000000',day,day), 'service_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.add_staff_waitlist_entry(%L,NULL,%L,%L,%L,%L)',cut,'Période longue','00000000',day,day+31), 'invalid_waitlist_preferences');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','aal','aal1')::text,true);
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',request_a,member_a,pose), 'waitlist_access_denied');
  PERFORM set_config('request.jwt.claims',claims,true);
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',request_a,member_a,pose-interval '15 minutes'), 'invalid_waitlist_slot');
  result_a := public.book_waitlist_entry(request_a,member_a,pose);
  repeated := public.book_waitlist_entry(request_a,member_a,pose);
  IF result_a <> repeated OR (SELECT count(*) FROM public.appointments WHERE client_name='Client test' AND salon_id=salon_a) <> 1 THEN
    RAISE EXCEPTION 'Repeated booking created a duplicate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_waitlist WHERE id=request_a AND status='booked' AND booked_appointment_id=result_a)
     OR NOT EXISTS (SELECT 1 FROM public.appointments WHERE id=result_a AND total_price=25 AND end_time=pose+interval '30 minutes') THEN
    RAISE EXCEPTION 'Waitlist conversion did not use authoritative appointment values';
  END IF;
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',request_b,member_a,pose), 'appointment_conflict');
  IF (SELECT status FROM public.booking_waitlist WHERE id=request_b) <> 'active'
     OR EXISTS (SELECT 1 FROM public.appointments WHERE client_name='Conflit test' AND salon_id=salon_a) THEN
    RAISE EXCEPTION 'Failed conversion did not roll back';
  END IF;
  flexible := public.add_staff_waitlist_entry(cut,NULL,'Flexible','00000000',day,day);
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',flexible,member_b,pose), 'invalid_staff');
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',flexible,member_a,(day+time '12:00') AT TIME ZONE 'Europe/Brussels'), 'outside_opening_hours');
  UPDATE public.staff SET daily_schedules=jsonb_build_object(to_char(day,'FMDay'),jsonb_build_object('start','09:00','end','15:00')) WHERE id=member_a;
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',flexible,member_a,(day+time '16:00') AT TIME ZONE 'Europe/Brussels'), 'outside_staff_hours');
  UPDATE public.booking_waitlist SET status='cancelled' WHERE id=flexible;
  PERFORM pg_temp.expect_error(format('SELECT public.book_waitlist_entry(%L,%L,%L)',flexible,member_a,pose), 'waitlist_already_processed');
  IF has_function_privilege('anon','public.book_waitlist_entry(uuid,uuid,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous booking access'; END IF;
  RAISE NOTICE 'PASS: waitlist conversion, preferences, processing windows, idempotency, rollback and tenant boundaries';
END $$;
ROLLBACK;
