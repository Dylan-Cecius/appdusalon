\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'recurrence_group_id'
  ),
  'appointments expose recurrence group metadata'
);

SELECT pg_temp.assert_true(
  to_regprocedure(
    'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'
  ) IS NOT NULL,
  'atomic recurring appointment RPC exists'
);

SELECT pg_temp.assert_true(
  position(
    'occurrences_param < 2'
    in pg_get_functiondef(
      'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'recurring RPC validates occurrence count'
);

SELECT pg_temp.assert_true(
  position(
    'recurrence_group_id'
    in pg_get_functiondef(
      'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'recurring RPC stores series identity'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'public',
    'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)',
    'EXECUTE'
  ),
  'recurring RPC is not executable by PUBLIC'
);

BEGIN;
SET LOCAL timezone = 'UTC';
DO $$
DECLARE
  owner_id uuid := gen_random_uuid(); salon uuid; member uuid := gen_random_uuid(); service uuid := gen_random_uuid();
  created public.appointments%ROWTYPE; count_created integer := 0; rejected boolean := false;
BEGIN
  INSERT INTO auth.users(id,email) VALUES(owner_id,owner_id::text||'@recurrence.invalid');
  SELECT id INTO STRICT salon FROM public.salons WHERE owner_user_id=owner_id;
  INSERT INTO public.staff(id,salon_id,name,daily_schedules)
    SELECT member,salon,'Série',jsonb_object_agg(d,jsonb_build_object('start','09:00','end','19:00'))
    FROM unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d;
  INSERT INTO public.opening_hours(salon_id,day_of_week,is_open,open_time,close_time)
    SELECT salon,d,true,'09:00','19:00' FROM generate_series(0,6) d
    ON CONFLICT(salon_id,day_of_week) DO UPDATE SET is_open=true,open_time='09:00',close_time='19:00',break_start=NULL,break_end=NULL;
  INSERT INTO public.services(id,salon_id,user_id,name,price,duration,category,appointment_buffer)
    VALUES(service,salon,owner_id,'Coupe',25,30,'coupe',5);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','aal','aal1')::text,true);
  FOR created IN SELECT * FROM public.create_recurring_appointments('DST','',jsonb_build_array(jsonb_build_object('id',service)),
      '2027-03-21 09:00Z','2027-03-21 09:35Z',member,NULL,'weekly',1,3) LOOP
    count_created := count_created + 1;
    IF (created.start_time AT TIME ZONE 'Europe/Brussels')::time <> time '10:00'
      OR created.end_time-created.start_time <> interval '35 minutes' THEN
      RAISE EXCEPTION 'Weekly recurrence shifted salon hour or duration across DST';
    END IF;
    IF created.recurrence_index=1 AND created.start_time <> timestamptz '2027-03-28 08:00Z' THEN
      RAISE EXCEPTION 'Second occurrence did not use summer offset';
    END IF;
  END LOOP;
  IF count_created<>3 OR current_setting('timezone')<>'UTC' THEN RAISE EXCEPTION 'Wrong series count or leaked timezone'; END IF;
  FOR created IN SELECT * FROM public.create_recurring_appointments('Monthly','',jsonb_build_array(jsonb_build_object('id',service)),
      '2027-01-31 11:00Z','2027-01-31 11:35Z',member,NULL,'monthly',1,3) LOOP
    IF (created.start_time AT TIME ZONE 'Europe/Brussels')::time <> time '12:00'
      OR (created.start_time AT TIME ZONE 'Europe/Brussels')::date <>
        (ARRAY[date '2027-01-31',date '2027-02-28',date '2027-03-31'])[created.recurrence_index+1] THEN
      RAISE EXCEPTION 'Monthly recurrence lost original day or salon hour';
    END IF;
  END LOOP;
  INSERT INTO public.staff_time_off(salon_id,staff_id,title,reason,starts_at,ends_at)
    VALUES(salon,member,'Absence future','leave','2027-04-14 14:00Z','2027-04-14 15:00Z');
  BEGIN
    PERFORM * FROM public.create_recurring_appointments('Must rollback','',jsonb_build_array(jsonb_build_object('id',service)),
      '2027-04-07 14:00Z','2027-04-07 14:35Z',member,NULL,'weekly',1,3);
  EXCEPTION WHEN OTHERS THEN
    IF position('staff_unavailable' in SQLERRM)=0 THEN RAISE; END IF;
    rejected := true;
  END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.appointments WHERE salon_id=salon AND client_name='Must rollback') THEN
    RAISE EXCEPTION 'Conflicting series was partially saved';
  END IF;
  RAISE NOTICE 'PASS: recurring salon DST, month-end clamping, duration and atomic rollback';
END $$;
ROLLBACK;
