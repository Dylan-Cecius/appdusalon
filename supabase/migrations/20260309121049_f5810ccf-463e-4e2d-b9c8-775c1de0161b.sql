
CREATE TABLE IF NOT EXISTS public.sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) UNIQUE NOT NULL,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 24,
  reminder_message TEXT DEFAULT 'Bonjour {prenom}, rappel de votre RDV le {date} a {heure} pour {prestation}. A bientot !',
  birthday_enabled BOOLEAN DEFAULT false,
  birthday_message TEXT DEFAULT 'Bonjour {prenom}, toute l equipe vous souhaite un joyeux anniversaire !',
  reactivation_enabled BOOLEAN DEFAULT false,
  reactivation_months INTEGER DEFAULT 3,
  reactivation_message TEXT DEFAULT 'Bonjour {prenom}, cela fait longtemps qu on ne vous a pas vu ! Revenez nous rendre visite.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'all',
  inactive_months INTEGER,
  recipients_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  phone_number TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  campaign_id UUID REFERENCES public.sms_campaigns(id),
  status TEXT DEFAULT 'sent',
  twilio_sid TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT false;

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_settings_salon_access" ON public.sms_settings FOR ALL TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "sms_campaigns_salon_access" ON public.sms_campaigns FOR ALL TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "sms_logs_salon_access" ON public.sms_logs FOR ALL TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));
