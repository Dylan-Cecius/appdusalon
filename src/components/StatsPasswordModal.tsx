import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StatsPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expectedPassword: string;
}

const StatsPasswordModal = ({ isOpen, onClose, onSuccess, expectedPassword }: StatsPasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expectedPassword || expectedPassword.trim() === '') {
      toast({
        title: "Configuration manquante",
        description: "Aucun mot de passe n'est défini pour l'accès aux statistiques. Configurez-le dans les paramètres.",
        variant: "destructive",
      });
      return;
    }

    if (password.trim() === expectedPassword.trim()) {
      onSuccess();
      setPassword('');
      setAttempts(0);
      toast({
        title: "✅ Accès autorisé",
        description: "Vous pouvez maintenant consulter les statistiques",
      });
    } else {
      setAttempts(prev => prev + 1);
      setPassword('');
      
      if (attempts >= 2) {
        toast({
          title: "❌ Trop de tentatives",
          description: "Accès bloqué temporairement pour des raisons de sécurité",
          variant: "destructive",
        });
        onClose();
        setAttempts(0);
      } else {
        toast({
          title: "❌ Mot de passe incorrect",
          description: `Tentative ${attempts + 1}/3`,
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    setPassword('');
    setAttempts(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            Accès sécurisé aux statistiques
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              Mot de passe administrateur
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Saisissez le mot de passe"
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {attempts > 0 && (
              <p className="text-sm text-destructive">
                Tentative {attempts}/3 - {3 - attempts} essai(s) restant(s)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!password.trim()}
            >
              Accéder
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          🔒 Cette protection empêche l'accès non autorisé aux données financières
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatsPasswordModal;