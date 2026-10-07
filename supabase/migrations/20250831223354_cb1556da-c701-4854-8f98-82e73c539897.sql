-- Legacy recovery of appointments for one historical account.
-- Compute window functions in SELECT CTEs: PostgreSQL does not allow them
-- directly in UPDATE SET expressions. On a fresh database these are no-ops.

-- Select the five latest appointments first, then number only that selection.
-- The id tie-breaker makes selection deterministic when created_at is equal.
WITH latest_appointments AS (
  SELECT id
  FROM public.appointments
  WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid
  ORDER BY created_at DESC, id
  LIMIT 5
), ranked_appointments AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS slot_index
  FROM latest_appointments
)
UPDATE public.appointments AS appointment
SET
  start_time = CURRENT_DATE + TIME '09:00:00' + ranked.slot_index * INTERVAL '2 hours',
  end_time = CURRENT_DATE + TIME '09:30:00' + ranked.slot_index * INTERVAL '2 hours',
  created_at = CURRENT_TIMESTAMP
FROM ranked_appointments AS ranked
WHERE appointment.id = ranked.id
  AND appointment.user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid;

-- Redistribute only the remaining past appointments of that same account.
-- Subtract an integer from the date before adding the time; subtracting an
-- interval would produce a timestamp, for which timestamp + time is invalid.
WITH ranked_past_appointments AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS slot_index
  FROM public.appointments
  WHERE user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid
    AND start_time < CURRENT_DATE
)
UPDATE public.appointments AS appointment
SET
  start_time = (CURRENT_DATE - 1) + TIME '10:00:00' + ranked.slot_index * INTERVAL '1 hour',
  end_time = (CURRENT_DATE - 1) + TIME '10:30:00' + ranked.slot_index * INTERVAL '1 hour'
FROM ranked_past_appointments AS ranked
WHERE appointment.id = ranked.id
  AND appointment.user_id = '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid;
