-- Mettre à jour toutes les dates de prochains envois avec la fonction corrigée
UPDATE automated_reports 
SET next_send_at = calculate_next_send_date(
  frequency,
  time_of_day,
  day_of_week,
  day_of_month
),
updated_at = NOW()
WHERE is_active = true;