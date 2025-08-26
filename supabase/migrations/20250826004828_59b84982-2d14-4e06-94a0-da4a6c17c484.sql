-- Fix barber_id null issue in appointments
UPDATE appointments 
SET barber_id = (SELECT id FROM barbers WHERE user_id = appointments.user_id LIMIT 1)
WHERE barber_id IS NULL AND user_id IS NOT NULL;