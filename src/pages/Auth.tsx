import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const navigate = useNavigate();
  const authFormRef = useRef<HTMLFormElement>(null);
  const forgotFormRef = useRef<HTMLFormElement>(null);

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'demo@appdusalon.com',
        password: 'Demo2024!',
      });
      if (error) {
        toast({
          title: "Erreur",
          description: "Le compte démo n'est pas disponible pour le moment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Mode démo activé",
          description: "Bienvenue dans la démonstration !",
        });
        navigate('/');
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de se connecter au compte démo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
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

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se connecter",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e?: FormEvent) => {
    e?.preventDefault();
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
          // Check if MFA is required
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp?.find(f => f.status === 'verified');

          if (verifiedFactor) {
            setMfaRequired(true);
            setMfaFactorId(verifiedFactor.id);
            setMfaCode('');
          } else {
            toast({
              title: "Connexion réussie",
              description: "Bienvenue !",
            });
            navigate('/');
          }
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

  const handleForgotPassword = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email envoyé",
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
        });
        setIsForgotPassword(false);
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

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6 || !mfaFactorId) return;

    setMfaVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast({
          title: "Code invalide",
          description: "Le code 2FA est incorrect. Veuillez réessayer.",
          variant: "destructive",
        });
        setMfaCode('');
      } else {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur de vérification 2FA",
        variant: "destructive",
      });
    } finally {
      setMfaVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          {mfaRequired ? (
            <div className="p-3 bg-accent rounded-lg mb-4">
              <ShieldCheck className="h-8 w-8 text-accent-foreground" />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img src={logoImg} alt="L'app du salon" className="h-96 sm:h-[480px] w-auto" />
              <p className="text-muted-foreground text-center text-sm sm:text-base -mt-4">
                {isForgotPassword 
                  ? 'Réinitialisez votre mot de passe' 
                  : isLogin 
                    ? 'Connectez-vous à votre compte' 
                    : 'Créez votre compte salon'}
              </p>
            </div>
          )}
          {mfaRequired && (
            <p className="text-muted-foreground text-center text-sm sm:text-base">
              Vérification en deux étapes
            </p>
          )}
        </div>

        {mfaRequired ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              Entrez le code à 6 chiffres de votre application d'authentification
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={(value) => setMfaCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full min-h-[48px] text-base touch-manipulation"
              onClick={handleMfaVerify}
              disabled={mfaCode.length !== 6 || mfaVerifying}
            >
              {mfaVerifying ? 'Vérification...' : 'Vérifier'}
            </Button>
            <Button
              variant="link"
              className="w-full text-sm"
              onClick={() => {
                setMfaRequired(false);
                setMfaFactorId(null);
                setMfaCode('');
                supabase.auth.signOut();
              }}
            >
              Retour à la connexion
            </Button>
          </div>
        ) : isForgotPassword ? (
          <form ref={forgotFormRef} onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="min-h-[48px] text-base"
                autoComplete="email"
              />
            </div>

            <Button
              type="button"
              className="w-full min-h-[48px] text-base touch-manipulation"
              disabled={loading}
              onClick={() => handleForgotPassword()}
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
            </Button>
          </form>
        ) : (
          <form ref={authFormRef} onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="min-h-[48px] text-base"
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="min-h-[48px] text-base pr-12"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation min-w-[48px]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm px-0 min-h-[44px] touch-manipulation"
                >
                  Mot de passe oublié ?
                </Button>
              </div>
            )}

            <Button
              type="button"
              className="w-full min-h-[48px] text-base touch-manipulation"
              disabled={loading}
              onClick={() => handleAuth()}
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
            </Button>

            {isLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[48px] text-base touch-manipulation border-purple-400 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950/30"
                disabled={loading}
                onClick={handleDemoLogin}
              >
                ✨ Essayer la démo gratuite
              </Button>
            )}
          </form>
        )}

        {!isForgotPassword && !mfaRequired && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continuer avec
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[48px] text-base touch-manipulation"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[48px] text-base touch-manipulation"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </Button>
            </div>
          </>
        )}

        {!mfaRequired && (
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsLogin(!isLogin);
                }
              }}
              className="text-sm min-h-[48px] touch-manipulation"
            >
              {isForgotPassword
                ? "Retour à la connexion"
                : isLogin 
                  ? "Pas de compte ? Créez-en un" 
                  : "Déjà un compte ? Connectez-vous"
              }
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;