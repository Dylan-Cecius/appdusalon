import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkProtection = async () => {
      setIsChecking(true);

      const sessionKey = `unlocked_${section}`;
      const alreadyUnlocked = sessionStorage.getItem(sessionKey) === 'true';

      try {
        const { data, error } = await (supabase as any).rpc('has_stats_password');
        if (error) throw error;

        if (cancelled) return;

        const hasPassword = data === true;
        if (!hasPassword || alreadyUnlocked) {
          setIsUnlocked(true);
          setShowPasswordModal(false);
        } else {
          setIsUnlocked(false);
          setShowPasswordModal(true);
        }
      } catch (error) {
        console.error('[ProtectedRoute] protection check failed', error);
        if (!cancelled) {
          toast({
            title: 'Erreur de sécurité',
            description: "Impossible de vérifier la protection de cette section.",
            variant: 'destructive',
          });
          navigate('/pos', { replace: true });
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    void checkProtection();

    return () => {
      cancelled = true;
    };
  }, [section, navigate, toast]);

  const verifyPassword = async (inputPassword: string): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any).rpc('verify_stats_password', {
        password_text: inputPassword,
      });

      if (error) throw error;

      if (data !== true) {
        toast({
          title: 'Mot de passe incorrect',
          description: 'Le mot de passe saisi est invalide.',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ProtectedRoute] password verification failed', error);
      toast({
        title: 'Erreur de sécurité',
        description: 'Impossible de vérifier le mot de passe.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handlePasswordSuccess = () => {
    setIsUnlocked(true);
    setShowPasswordModal(false);
    sessionStorage.setItem(`unlocked_${section}`, 'true');
  };

  const handlePasswordClose = () => {
    setShowPasswordModal(false);
    navigate('/pos');
  };

  if (isChecking) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-sm text-muted-foreground">
        Vérification de l’accès…
      </div>
    );
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
