import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Scissors } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Pas authentifié, rediriger vers /auth
        navigate('/auth');
      } else {
        // Authentifié, récupérer la dernière section visitée
        const lastSection = localStorage.getItem('lastVisitedSection');
        if (lastSection) {
          navigate(lastSection);
        } else {
          // Par défaut, aller sur /pos
          navigate('/pos');
        }
      }
    }
  }, [user, loading, navigate]);

  // Affichage pendant le chargement
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
      <div className="text-center">
        <div className="p-3 bg-accent rounded-lg mb-4 inline-block">
          <Scissors className="h-8 w-8 text-accent-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
};

export default Dashboard;
