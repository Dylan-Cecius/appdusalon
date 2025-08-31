import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Gift, Ticket, Sparkles, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PromoCodeRedemptionProps {
  onSuccess?: () => void;
}

const PromoCodeRedemption = ({ onSuccess }: PromoCodeRedemptionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);

  const redeemPromoCode = async () => {
    if (!user || !promoCode.trim()) return;
    
    setLoading(true);
    try {
      // Appeler la fonction RPC pour utiliser le code promo
      const { data, error } = await supabase.rpc('use_promo_code', {
        code_text: promoCode.toUpperCase().trim(),
        user_id_param: user.id
      });
      
      if (error) throw error;
      
      // Cast data to the expected type
      const result = data as { success: boolean; message: string; type?: string; description?: string };
      
      if (result.success) {
        toast({
          title: "🎉 Code promo activé !",
          description: result.message,
        });
        
        // Détails selon le type de code
        if (result.type === 'trial_month') {
          toast({
            title: "✨ Essai gratuit activé",
            description: "Vous avez maintenant accès au plan Pro pendant 1 mois !",
          });
        } else if (result.type === 'lifetime_free') {
          toast({
            title: "👑 Abonnement à vie activé",
            description: "Félicitations ! Vous avez maintenant un accès Enterprise à vie !",
          });
        }
        
        setPromoCode('');
        onSuccess?.();
      } else {
        toast({
          title: "❌ Code invalide",
          description: result.message || "Ce code promo n'est pas valide",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error redeeming promo code:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'activation du code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      redeemPromoCode();
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full text-white mb-4">
          <Gift className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
          Vous avez un code promo ?
        </h3>
        <p className="text-sm text-green-600 dark:text-green-300">
          Bénéficiez d'un essai gratuit ou d'un abonnement à vie !
        </p>
      </div>

      <Separator className="mb-6 bg-green-200 dark:bg-green-800" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="promo-code" className="text-green-800 dark:text-green-200">
            Code promo
          </Label>
          <div className="flex gap-2">
            <Input
              id="promo-code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="ENTREZ VOTRE CODE"
              className="uppercase font-mono bg-white dark:bg-green-950/50 border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400"
            />
            <Button
              onClick={redeemPromoCode}
              disabled={!promoCode.trim() || loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6"
            >
              {loading ? "..." : "Activer"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Essai gratuit</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">1 mois d'accès Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Abonnement à vie</p>
              <p className="text-xs text-purple-600 dark:text-purple-300">Accès Enterprise illimité</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            Codes valides une seule fois par utilisateur
          </p>
        </div>
      </div>
    </Card>
  );
};

export default PromoCodeRedemption;