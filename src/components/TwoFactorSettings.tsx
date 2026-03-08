import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const TwoFactorSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const totpFactor = data.totp.find(f => f.status === 'verified');
      if (totpFactor) {
        setIsEnabled(true);
        setFactorId(totpFactor.id);
      } else {
        setIsEnabled(false);
        setFactorId(null);
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Unenroll any unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp) {
        for (const f of factors.totp) {
          if (f.status === 'unverified') {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Salon App TOTP',
      });

      if (error) throw error;

      setPendingFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setTotpCode('');
      setShowEnrollDialog(true);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'activer la 2FA",
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnroll = async () => {
    if (totpCode.length !== 6 || !pendingFactorId) return;

    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: pendingFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw verifyError;

      setIsEnabled(true);
      setFactorId(pendingFactorId);
      setShowEnrollDialog(false);
      setPendingFactorId(null);
      toast({
        title: '2FA activée',
        description: 'La double authentification est maintenant active sur votre compte.',
      });
    } catch (error: any) {
      toast({
        title: 'Code invalide',
        description: 'Le code TOTP est incorrect. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    if (!factorId) return;

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setIsEnabled(false);
      setFactorId(null);
      setShowDisableConfirm(false);
      toast({
        title: '2FA désactivée',
        description: 'La double authentification a été désactivée.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de désactiver la 2FA',
        variant: 'destructive',
      });
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {isEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            Double authentification (2FA)
          </CardTitle>
          <CardDescription>
            Protégez votre compte avec un code TOTP (Google Authenticator, Authy...)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Statut :</span>
              {isEnabled ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  2FA activée
                </Badge>
              ) : (
                <Badge variant="secondary">2FA désactivée</Badge>
              )}
            </div>

            {isEnabled ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDisableConfirm(true)}
              >
                Désactiver la 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Activer la 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enroll Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer la 2FA</DialogTitle>
            <DialogDescription>
              Scannez le QR code avec votre application d'authentification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>

            {/* Secret key */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Ou entrez ce code manuellement :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all select-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* TOTP verification */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">
                Entrez le code à 6 chiffres de votre application :
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={(value) => setTotpCode(value)}
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
                className="w-full"
                onClick={handleVerifyEnroll}
                disabled={totpCode.length !== 6 || verifying}
              >
                {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vérifier et activer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable confirmation */}
      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la 2FA ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre compte sera moins sécurisé sans la double authentification. Êtes-vous certain de vouloir la désactiver ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnenroll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TwoFactorSettings;
