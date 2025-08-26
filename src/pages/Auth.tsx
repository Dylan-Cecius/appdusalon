import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Scissors, Eye, EyeOff, Sparkles, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message === 'Invalid login credentials') {
            toast({
              title: "Erreur de connexion",
              description: "Email ou mot de passe incorrect",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue !",
          });
          navigate('/');
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) {
          if (error.message === 'User already registered') {
            toast({
              title: "Compte existant",
              description: "Un compte avec cet email existe déjà. Connectez-vous à la place.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Inscription réussie",
            description: "Vérifiez votre email pour confirmer votre compte",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-60 h-60 bg-gradient-to-r from-primary/30 to-accent/20 rounded-full blur-2xl animate-pulse delay-300"></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-gradient-to-r from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-20 left-20 animate-bounce delay-100">
          <Scissors className="h-6 w-6 text-accent/40" />
        </div>
        <div className="absolute top-32 right-32 animate-bounce delay-300">
          <Sparkles className="h-4 w-4 text-primary/40" />
        </div>
        <div className="absolute bottom-40 left-32 animate-bounce delay-500">
          <Star className="h-5 w-5 text-accent/40" />
        </div>
        <div className="absolute bottom-20 right-20 animate-bounce delay-700">
          <Sparkles className="h-3 w-3 text-primary/40" />
        </div>
      </div>

      {/* Main Auth Card with Glassmorphism */}
      <Card className="w-full max-w-md p-8 relative backdrop-blur-xl bg-card/80 border-2 border-accent/20 shadow-2xl animate-fade-in">
        {/* Glowing Border Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg blur-sm -z-10"></div>
        
        <div className="flex flex-col items-center mb-8 relative">
          {/* Animated Logo Container */}
          <div className="relative p-4 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl mb-6 backdrop-blur-sm border border-accent/30 hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl animate-pulse"></div>
            <Scissors className="h-10 w-10 text-accent-foreground relative z-10 animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-fade-in delay-200">
            L&apos;app du salon
          </h1>
          <p className="text-muted-foreground text-center mt-2 animate-fade-in delay-300">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte salon'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 animate-fade-in delay-400">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="h-12 backdrop-blur-sm bg-background/50 border-accent/30 focus:border-accent focus:ring-accent/20 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 backdrop-blur-sm bg-background/50 border-accent/30 focus:border-accent focus:ring-accent/20 transition-all duration-300 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent/20 transition-colors duration-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium" 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                Chargement...
              </div>
            ) : (
              isLogin ? 'Se connecter' : 'S\'inscrire'
            )}
          </Button>
        </form>

        <div className="mt-8 text-center animate-fade-in delay-500">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm hover:text-accent transition-colors duration-200 relative group"
          >
            <span className="relative z-10">
              {isLogin 
                ? "Pas de compte ? Créez-en un" 
                : "Déjà un compte ? Connectez-vous"
              }
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded"></div>
          </Button>
        </div>
      </Card>

      {/* Floating Elements for Extra Ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-accent/60 rounded-full animate-ping delay-100"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary/60 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-1/4 left-3/4 w-1.5 h-1.5 bg-accent/40 rounded-full animate-ping delay-500"></div>
      </div>
    </div>
  );
};

export default Auth;