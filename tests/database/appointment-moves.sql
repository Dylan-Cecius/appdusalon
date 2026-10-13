\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.expect_move_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(expected in SQLERRM)>0 THEN RETURN; END IF; RAISE; END;
  RAISE EXCEPTION 'Expected rejection: %', expected;
END $$;
DO $$
DECLARE
  owner_a uuid := gen_random_uuid(); owner_b uuid := gen_random_uuid(); salon_a uuid; salon_b uuid;
  old_member uuid := gen_random_uuid(); new_member uuid := gen_random_uuid(); foreign_member uuid := gen_random_uuid();
  color_service_id uuid := gen_random_uuid(); cut_service_id uuid := gen_random_uuid(); booking uuid; affected integer;
  booked public.appointments%ROWTYPE; moved public.appointments%ROWTYPE; saved_phases jsonb; moved_phases jsonb;
  day date := (now() AT TIME ZONE 'Europe/Brussels')::date+1; start_at timestamptz; target_at timestamptz;
BEGIN
  INSERT INTO auth.users(id,email) VALUES(owner_a,owner_a::text||'@move.invalid'),(owner_b,owner_b::text||'@move.invalid');
  SELECT id INTO STRICT salon_a FROM public.salons WHERE owner_user_id=owner_a;
  SELECT id INTO STRICT salon_b FROM public.salons WHERE owner_user_id=owner_b;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules)
    SELECT old_member,salon_a,'Ancien',jsonb_object_agg(d,jsonb_build_object('start','09:00','end','19:00'))
    FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d;
  INSERT INTO public.staff(id,salon_id,name) VALUES(foreign_member,salon_b,'Autre salon');
  INSERT INTO public.opening_hours(salon_id,day_of_week,is_open,open_time,close_time)
    SELECT salon_a,d,true,'09:00','19:00' FROM generate_series(0,6) d
    ON CONFLICT(salon_id,day_of_week) DO UPDATE SET is_open=true,open_time='09:00',close_time='19:00',break_start=NULL,break_end=NULL;
  INSERT INTO public.services(id,salon_id,user_id,name,price,duration,category,appointment_buffer) VALUES
    (color_service_id,salon_a,owner_a,'Coloration',75,90,'coupe',0),(cut_service_id,salon_a,owner_a,'Coupe',25,30,'coupe',0);
  INSERT INTO public.service_steps(service_id,salon_id,position,name,step_type,duration_minutes) VALUES
    (color_service_id,salon_a,0,'Application','work',30),(color_service_id,salon_a,1,'Pose','pause',30),(color_service_id,salon_a,2,'Finition','work',30);
  start_at := (day+time '09:00') AT TIME ZONE 'Europe/Brussels';
  target_at := (day+time '14:00') AT TIME ZONE 'Europe/Brussels';
  INSERT INTO public.appointments(client_name,client_phone,services,start_time,end_time,status,total_price,is_paid,staff_id,user_id,salon_id,payment_status,amount_paid,notes)
    VALUES('Client déplacé','00000000',jsonb_build_array(jsonb_build_object('id',color_service_id)),start_at,start_at+interval '90 minutes','scheduled',75,false,old_member,owner_a,salon_a,'deposit_paid',20,'Note conservée') RETURNING * INTO booked;
  booking := booked.id;
  SELECT jsonb_agg(jsonb_build_array(id,label,segment_type,starts_at-start_at,ends_at-start_at,occupies_staff) ORDER BY position)
    INTO saved_phases FROM public.appointment_segments WHERE appointment_id=booking;
  -- Retired service and employee are realistic legacy data, within the active-staff plan limit.
  DELETE FROM public.service_steps WHERE service_id=color_service_id;
  UPDATE public.services SET price=999,duration=180,is_active=false WHERE id=color_service_id;
  UPDATE public.staff SET is_active=false WHERE id=old_member;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules) SELECT new_member,salon_a,'Nouveau',daily_schedules FROM public.staff WHERE id=old_member;
  UPDATE public.appointments SET start_time=target_at,staff_id=new_member WHERE id=booking RETURNING * INTO moved;
  SELECT jsonb_agg(jsonb_build_array(id,label,segment_type,starts_at-target_at,ends_at-target_at,occupies_staff) ORDER BY position)
    INTO moved_phases FROM public.appointment_segments WHERE appointment_id=booking;
  IF moved.total_price<>75 OR moved.services<>booked.services OR moved.amount_paid<>20 OR moved.payment_status<>'deposit_paid'
     OR moved.notes<>'Note conservée' OR moved.end_time-moved.start_time<>interval '90 minutes' OR saved_phases<>moved_phases
     OR EXISTS(SELECT 1 FROM public.appointment_segments WHERE appointment_id=booking AND staff_id<>new_member) THEN
    RAISE EXCEPTION 'Move changed booked values, payments, notes, saved phases or staff assignment';
  END IF;
  INSERT INTO public.appointments(client_name,client_phone,services,start_time,end_time,status,total_price,is_paid,staff_id,user_id,salon_id)
    VALUES('Pendant la pose','00000001',jsonb_build_array(jsonb_build_object('id',cut_service_id)),target_at+interval '30 minutes',target_at+interval '60 minutes','scheduled',25,false,new_member,owner_a,salon_a);
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',target_at+interval '15 minutes',booking),'appointment_conflict');
  IF (SELECT start_time FROM public.appointments WHERE id=booking)<>target_at THEN RAISE EXCEPTION 'Failed move changed appointment'; END IF;
  SELECT jsonb_agg(jsonb_build_array(id,label,segment_type,starts_at-target_at,ends_at-target_at,occupies_staff) ORDER BY position)
    INTO moved_phases FROM public.appointment_segments WHERE appointment_id=booking;
  IF saved_phases<>moved_phases THEN RAISE EXCEPTION 'Failed move changed saved phases'; END IF;
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET staff_id=%L WHERE id=%L',foreign_member,booking),'invalid_staff');
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',(day+time '18:00') AT TIME ZONE 'Europe/Brussels',booking),'outside_opening_hours');
  UPDATE public.staff SET daily_schedules=(SELECT jsonb_object_agg(d,jsonb_build_object('start','09:00','end','17:00')) FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d) WHERE id=new_member;
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',(day+time '16:00') AT TIME ZONE 'Europe/Brussels',booking),'outside_staff_hours');
  INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at)
    VALUES(salon_a,new_member,'Formation','training',target_at+interval '1 day',target_at+interval '1 day 2 hours');
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',target_at+interval '1 day',booking),'staff_unavailable');
  UPDATE public.appointments SET start_time=target_at+interval '2 days' WHERE id=booking AND updated_at=booked.updated_at-interval '1 second';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Stale conditional update was accepted'; END IF;
  DELETE FROM public.appointment_segments WHERE appointment_id=booking;
  UPDATE public.appointments SET start_time=start_at+interval '2 days' WHERE id=booking;
  IF (SELECT count(*) FROM public.appointment_segments WHERE appointment_id=booking AND occupies_staff AND segment_type='block' AND ends_at-starts_at=interval '90 minutes')<>1 THEN
    RAISE EXCEPTION 'Missing snapshot invented processing availability';
  END IF;
  UPDATE public.appointments SET status='completed' WHERE id=booking;
  PERFORM pg_temp.expect_move_error(format('UPDATE public.appointments SET start_time=%L WHERE id=%L',start_at+interval '3 days',booking),'appointment_not_movable');
  PERFORM set_config('test.move.id',booking::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','aal','aal1')::text,true);
  RAISE NOTICE 'PASS: saved price, deposit, retired service, phases, free processing, conflicts, rollback, schedules, stale revision and fallback';
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; BEGIN
  UPDATE public.appointments SET start_time=start_time+interval '1 day' WHERE id=current_setting('test.move.id')::uuid;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Cross-salon move'; END IF;
  RAISE NOTICE 'PASS: cross-salon appointment move rejected by RLS';
END $$;
RESET ROLE;
ROLLBACK;
