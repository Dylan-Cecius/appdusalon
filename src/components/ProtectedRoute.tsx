import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import StatsPasswordModal from '@/components/StatsPasswordModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  section: 'stats' | 'settings' | 'reports';
}

const ProtectedRoute = ({ children, section }: ProtectedRouteProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { salonSettings } = useSupabaseSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si un mot de passe est configuré
    if (!salonSettings?.stats_password) {
      // Pas de mot de passe configuré, accès libre
      setIsUnlocked(true);
      setIsChecking(false);
      return;
    }

    // Vérifier si la section est déjà déverrouillée dans la session
    const sessionKey = `unlocked_${section}`;
    const isSessionUnlocked = sessionStorage.getItem(sessionKey) === 'true';
    
    if (isSessionUnlocked) {
      setIsUnlocked(true);
      setIsChecking(false);
    } else {
      // Afficher le modal de mot de passe
      setShowPasswordModal(true);
      setIsChecking(false);
    }
  }, [salonSettings, section]);

  const verifyPassword = async (inputPassword: string): Promise<boolean> => {
    if (!salonSettings?.stats_password) {
      toast({
        title: "❌ Aucun mot de passe configuré",
        description: "Définissez un mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false;
    }

    // Pour les paramètres, permettre l'accès avec ancien mot de passe pour migration
    if (section === 'settings' && !salonSettings.stats_password.startsWith('$2')) {
      if (inputPassword === salonSettings.stats_password) {
        toast({
          title: "⚠️ Accès temporaire accordé",
          description: "Veuillez définir un nouveau mot de passe sécurisé immédiatement.",
          variant: "destructive",
        });
        return true;
      } else {
        toast({
          title: "❌ Mot de passe incorrect",
          description: "Mot de passe invalide.",
          variant: "destructive",
        });
        return false;
      }
    }

    // Pour les autres sections, seulement les mots de passe hashés
    if (!salonSettings.stats_password.startsWith('$2')) {
      toast({
        title: "🔒 Mot de passe non sécurisé détecté",
        description: "Veuillez définir un nouveau mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });
      
      if (error) {
        console.error('Password verification error:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  const handlePasswordSuccess = () => {
    setIsUnlocked(true);
    setShowPasswordModal(false);
    // Sauvegarder dans sessionStorage pour cette session
    sessionStorage.setItem(`unlocked_${section}`, 'true');
  };

  const handlePasswordClose = () => {
    setShowPasswordModal(false);
    // Rediriger vers /pos si l'utilisateur annule
    navigate('/pos');
  };

  if (isChecking) {
    return null;
  }

  if (!isUnlocked) {
    return (
      <StatsPasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordClose}
        onSuccess={handlePasswordSuccess}
        onVerifyPassword={verifyPassword}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
