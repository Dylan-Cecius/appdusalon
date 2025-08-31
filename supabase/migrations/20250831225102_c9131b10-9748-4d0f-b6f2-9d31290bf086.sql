-- Créer une table pour les codes promo
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('trial_month', 'lifetime_free')),
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour suivre l'utilisation des codes promo
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_type TEXT NOT NULL,
  UNIQUE(promo_code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour promo_codes
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Politiques RLS pour promo_code_usage  
CREATE POLICY "Users can view their own usage" ON public.promo_code_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage records" ON public.promo_code_usage
  FOR INSERT WITH CHECK (true);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour valider et utiliser un code promo
CREATE OR REPLACE FUNCTION public.use_promo_code(code_text TEXT, user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    promo_record promo_codes%ROWTYPE;
    usage_count INTEGER;
    result JSON;
BEGIN
    -- Vérifier si le code existe et est actif
    SELECT * INTO promo_record 
    FROM promo_codes 
    WHERE code = code_text AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Code promo invalide ou expiré');
    END IF;
    
    -- Vérifier si le code n'a pas expiré
    IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Ce code promo a expiré');
    END IF;
    
    -- Vérifier si l'utilisateur n'a pas déjà utilisé ce code
    SELECT COUNT(*) INTO usage_count 
    FROM promo_code_usage 
    WHERE promo_code_id = promo_record.id AND user_id = user_id_param;
    
    IF usage_count > 0 THEN
        RETURN json_build_object('success', false, 'message', 'Vous avez déjà utilisé ce code promo');
    END IF;
    
    -- Vérifier si le code n'a pas atteint sa limite d'utilisation
    IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
        RETURN json_build_object('success', false, 'message', 'Ce code promo a atteint sa limite d''utilisation');
    END IF;
    
    -- Enregistrer l'utilisation du code
    INSERT INTO promo_code_usage (promo_code_id, user_id, subscription_type)
    VALUES (promo_record.id, user_id_param, promo_record.type);
    
    -- Incrémenter le compteur d'utilisations
    UPDATE promo_codes 
    SET current_uses = current_uses + 1, updated_at = NOW()
    WHERE id = promo_record.id;
    
    -- Mettre à jour la table subscribers selon le type de code
    IF promo_record.type = 'trial_month' THEN
        -- Essai d'1 mois
        INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
        VALUES (
            user_id_param, 
            (SELECT email FROM auth.users WHERE id = user_id_param),
            true, 
            'Pro', 
            NOW() + INTERVAL '1 month',
            NOW()
        )
        ON CONFLICT (email) 
        DO UPDATE SET 
            subscribed = true,
            subscription_tier = 'Pro',
            subscription_end = NOW() + INTERVAL '1 month',
            updated_at = NOW();
            
    ELSIF promo_record.type = 'lifetime_free' THEN
        -- Abonnement à vie
        INSERT INTO subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
        VALUES (
            user_id_param,
            (SELECT email FROM auth.users WHERE id = user_id_param),
            true,
            'Enterprise',
            NULL, -- NULL pour à vie
            NOW()
        )
        ON CONFLICT (email)
        DO UPDATE SET 
            subscribed = true,
            subscription_tier = 'Enterprise',
            subscription_end = NULL,
            updated_at = NOW();
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Code promo activé avec succès !',
        'type', promo_record.type,
        'description', promo_record.description
    );
END;
$$;