-- Mettre à jour tous les rapports existants avec les bonnes dates en utilisant la nouvelle fonction
UPDATE automated_reports 
SET next_send_at = calculate_next_send_date(
  frequency,
  time_of_day::text,
  day_of_week,
  day_of_month
)
WHERE next_send_at IS NOT NULL;