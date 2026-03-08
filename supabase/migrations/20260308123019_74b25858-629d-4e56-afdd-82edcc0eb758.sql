
-- Add is_demo column to salons
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create reset_demo_data function
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  demo_salon_id uuid;
  demo_user_id uuid;
  client_ids uuid[];
  c_id uuid;
  svc_ids uuid[];
  s_id uuid;
  barber_ids uuid[];
  b_id uuid;
  i int;
  tx_date timestamptz;
  appt_date timestamptz;
  client_names text[] := ARRAY['Sophie Martin','Marie Dubois','Julie Bernard','Emma Petit','Camille Moreau','Laura Simon','Alice Leroy','Chloe Roux','Manon Blanc','Sarah Garnier','Thomas Durand','Lucas Fontaine','Hugo Mercier','Pierre Lambert','Antoine Rousseau'];
  client_phones text[] := ARRAY['0601020304','0602030405','0603040506','0604050607','0605060708','0606070809','0607080910','0608091011','0609101112','0610111213','0611121314','0612131415','0613141516','0614151617','0615161718'];
  client_notes text[] := ARRAY['Allergie coloration','Client fidèle depuis 3 ans',NULL,'Préfère les coupes courtes',NULL,NULL,'Sensibilité cuir chevelu',NULL,'Cliente régulière',NULL,NULL,'Nouveau client',NULL,'VIP - offrir café',NULL];
  service_names text[] := ARRAY['Coupe homme','Coupe femme','Brushing','Coloration','Mèches','Soin cheveux','Barbe','Coupe enfant'];
  service_prices numeric[] := ARRAY[25,45,35,75,90,30,15,20];
  service_durations int[] := ARRAY[30,45,40,90,120,30,20,25];
  service_cats text[] := ARRAY['coupe','coupe','coupe','coloration','coloration','soin','barbe','coupe'];
BEGIN
  -- Get or create demo salon
  SELECT id INTO demo_salon_id FROM salons WHERE is_demo = true LIMIT 1;
  
  IF demo_salon_id IS NULL THEN
    RAISE EXCEPTION 'No demo salon found';
  END IF;

  -- Get demo user (salon owner)
  SELECT owner_user_id INTO demo_user_id FROM salons WHERE id = demo_salon_id;

  -- Delete existing demo data
  DELETE FROM transactions WHERE salon_id = demo_salon_id;
  DELETE FROM appointments WHERE salon_id = demo_salon_id;
  DELETE FROM clients WHERE salon_id = demo_salon_id;
  DELETE FROM services WHERE salon_id = demo_salon_id;
  DELETE FROM barbers WHERE salon_id = demo_salon_id;
  DELETE FROM custom_blocks WHERE salon_id = demo_salon_id;
  DELETE FROM lunch_breaks WHERE salon_id = demo_salon_id;
  DELETE FROM todo_items WHERE salon_id = demo_salon_id;

  -- Insert services
  svc_ids := ARRAY[]::uuid[];
  FOR i IN 1..8 LOOP
    INSERT INTO services (name, price, duration, category, salon_id, user_id, display_order, is_active)
    VALUES (service_names[i], service_prices[i], service_durations[i], service_cats[i], demo_salon_id, demo_user_id, i, true)
    RETURNING id INTO s_id;
    svc_ids := array_append(svc_ids, s_id);
  END LOOP;

  -- Insert barbers
  barber_ids := ARRAY[]::uuid[];
  INSERT INTO barbers (name, salon_id, user_id, color, start_time, end_time, is_active, working_days)
  VALUES ('Marie', demo_salon_id, demo_user_id, 'bg-purple-600', '09:00', '18:00', true, '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}')
  RETURNING id INTO b_id;
  barber_ids := array_append(barber_ids, b_id);

  INSERT INTO barbers (name, salon_id, user_id, color, start_time, end_time, is_active, working_days)
  VALUES ('Julie', demo_salon_id, demo_user_id, 'bg-pink-600', '09:00', '18:00', true, '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}')
  RETURNING id INTO b_id;
  barber_ids := array_append(barber_ids, b_id);

  -- Insert clients
  client_ids := ARRAY[]::uuid[];
  FOR i IN 1..15 LOOP
    INSERT INTO clients (name, phone, salon_id, user_id, notes, created_at)
    VALUES (
      client_names[i],
      client_phones[i],
      demo_salon_id,
      demo_user_id,
      client_notes[i],
      now() - (random() * interval '180 days')
    )
    RETURNING id INTO c_id;
    client_ids := array_append(client_ids, c_id);
  END LOOP;

  -- Insert 40 transactions over last 90 days with growing monthly revenue
  FOR i IN 1..40 LOOP
    -- Distribute: more recent = more transactions (growing revenue)
    tx_date := now() - (power(random(), 1.5) * interval '90 days');
    
    DECLARE
      svc_index int := 1 + floor(random() * 8)::int;
      amount numeric;
      items_json jsonb;
      selected_client uuid;
    BEGIN
      selected_client := client_ids[1 + floor(random() * 15)::int];
      
      -- Sometimes combine services
      IF random() > 0.7 THEN
        DECLARE
          svc2_index int := 1 + floor(random() * 8)::int;
        BEGIN
          amount := service_prices[svc_index] + service_prices[svc2_index];
          items_json := jsonb_build_array(
            jsonb_build_object('name', service_names[svc_index], 'price', service_prices[svc_index], 'quantity', 1),
            jsonb_build_object('name', service_names[svc2_index], 'price', service_prices[svc2_index], 'quantity', 1)
          );
        END;
      ELSE
        amount := service_prices[svc_index];
        items_json := jsonb_build_array(
          jsonb_build_object('name', service_names[svc_index], 'price', service_prices[svc_index], 'quantity', 1)
        );
      END IF;

      INSERT INTO transactions (user_id, salon_id, client_id, items, total_amount, payment_method, transaction_date, created_at)
      VALUES (
        demo_user_id,
        demo_salon_id,
        selected_client,
        items_json,
        amount,
        (ARRAY['cash','card','card','card'])[1 + floor(random() * 4)::int],
        tx_date,
        tx_date
      );
    END;
  END LOOP;

  -- Insert 8 future appointments over next 14 days
  FOR i IN 1..8 LOOP
    appt_date := date_trunc('day', now()) + ((1 + floor(random() * 14))::int * interval '1 day')
      + ((9 + floor(random() * 9))::int * interval '1 hour');
    
    DECLARE
      svc_index int := 1 + floor(random() * 8)::int;
      selected_client_idx int := 1 + floor(random() * 15)::int;
      dur interval;
    BEGIN
      dur := (service_durations[svc_index] * interval '1 minute');
      
      INSERT INTO appointments (
        user_id, salon_id, client_name, client_phone, barber_id,
        services, start_time, end_time, total_price, status, created_at
      ) VALUES (
        demo_user_id,
        demo_salon_id,
        client_names[selected_client_idx],
        client_phones[selected_client_idx],
        barber_ids[1 + (i % 2)]::text,
        jsonb_build_array(jsonb_build_object('name', service_names[svc_index], 'price', service_prices[svc_index])),
        appt_date,
        appt_date + dur,
        service_prices[svc_index],
        'scheduled',
        now()
      );
    END;
  END LOOP;
END;
$$;
