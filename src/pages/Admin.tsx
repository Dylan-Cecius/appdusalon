import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check admin access
  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user.email !== 'dylan.cecius@gmail.com') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  if (!user || user.email !== 'dylan.cecius@gmail.com') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-primary">
                    Administration Salon Pro
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Gestion des abonnements et utilisateurs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Page d'administration</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Bienvenue sur la page d'administration. Cette page est en cours de développement.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;