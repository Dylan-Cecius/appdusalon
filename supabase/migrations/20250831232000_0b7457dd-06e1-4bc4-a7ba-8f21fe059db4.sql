-- Créer un trigger pour calculer automatiquement next_send_at lors de la création ou modification d'un rapport
CREATE TRIGGER trigger_set_next_send_date
  BEFORE INSERT OR UPDATE ON automated_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_next_send_date();