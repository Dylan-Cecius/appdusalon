export interface AutomatedReport {
  id: string;
  user_id: string;
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  time_of_day: string;
  day_of_week: number | null;
  day_of_month: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomatedReportData {
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  time_of_day: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
}

export function isReportEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
/** Only configuration fields; never accept owner, schedule timestamps, activation or identity from a form. */
export function automatedReportFields(input: CreateAutomatedReportData): CreateAutomatedReportData {
  const name = typeof input.report_name === 'string' ? input.report_name.trim() : '';
  if (!name || /[\r\n]/.test(name)) throw new Error('Indiquez un nom de rapport sur une seule ligne.');
  if (!['daily','weekly','monthly'].includes(input.frequency)) throw new Error('Choisissez une fréquence valide.');
  if (!Array.isArray(input.recipient_emails) || !input.recipient_emails.length || input.recipient_emails.some(email => typeof email !== 'string' || !isReportEmail(email.trim()))) throw new Error('Ajoutez au moins une adresse e-mail valide.');
  const emails = [...new Set(input.recipient_emails.map(email => email.trim()))];
  if (!Array.isArray(input.report_types) || !input.report_types.length || input.report_types.some(type => !['revenue','appointments','stats','clients'].includes(type))) throw new Error('Choisissez au moins un type de rapport valide.');
  if (typeof input.time_of_day !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.time_of_day)) throw new Error('Indiquez une heure valide.');
  if (input.frequency === 'weekly' && (!Number.isInteger(input.day_of_week) || input.day_of_week! < 1 || input.day_of_week! > 7)) throw new Error('Choisissez un jour de semaine entre lundi et dimanche.');
  if (input.frequency === 'monthly' && (!Number.isInteger(input.day_of_month) || input.day_of_month! < 1 || input.day_of_month! > 28)) throw new Error('Choisissez un jour du mois entre 1 et 28.');
  return { report_name: name, frequency: input.frequency, recipient_emails: emails, report_types: [...new Set(input.report_types)], time_of_day: input.time_of_day.length === 5 ? input.time_of_day + ':00' : input.time_of_day, day_of_week: input.frequency === 'weekly' ? input.day_of_week : null, day_of_month: input.frequency === 'monthly' ? input.day_of_month : null };
}
