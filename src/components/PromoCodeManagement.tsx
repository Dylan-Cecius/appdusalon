import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Gift, Plus, Clock, Users, Check, X, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PromoCode {
  id: string;
  code: string;
  type: 'trial_month' | 'lifetime_free';
  description: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  created_at: string;
}

const PromoCodeManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulaire pour créer un code promo
  const [newCode, setNewCode] = useState({
    code: '',
    type: 'trial_month' as 'trial_month' | 'lifetime_free',
    description: '',
    max_uses: 1,
    expires_at: ''
  });

  const fetchPromoCodes = async () => {
    if (!user) return;
    
    try {
      // Seul Dylan peut voir tous les codes promo grâce aux RLS policies
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPromoCodes(data as PromoCode[] || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes promo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code: result }));
  };

  const createPromoCode = async () => {
    if (!user || !newCode.code.trim()) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('create-promo-code', {
        body: {
          code: newCode.code.toUpperCase(),
          type: newCode.type,
          description: newCode.description,
          max_uses: newCode.max_uses || null,
          expires_at: newCode.expires_at || null,
        },
      });
      if (error) throw error as any;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      if (error) throw error;
      
      toast({
        title: "Code promo créé",
        description: `Le code ${newCode.code} a été créé avec succès`,
      });
      
      // Reset form
      setNewCode({
        code: '',
        type: 'trial_month',
        description: '',
        max_uses: 1,
        expires_at: ''
      });
      
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      const rawMsg = error?.message?.toString?.() || String(error);
      let friendly = "Impossible de créer le code promo";

      if (/row-level security|permission denied|not authorized|forbidden/i.test(rawMsg)) {
        friendly = "Accès refusé: seul le compte autorisé peut créer des codes promo";
      } else if (/duplicate key|unique/i.test(rawMsg)) {
        friendly = "Ce code existe déjà";
      } else if (/timestamp|date|invalid input/i.test(rawMsg)) {
        friendly = "Format de date invalide. Choisissez une date valide";
      }

      toast({
        title: "Erreur",
        description: friendly,
        variant: "destructive",
      });
    }
  };
  const toggleCodeStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: currentStatus ? "Code désactivé" : "Code activé",
        description: "Le statut du code promo a été mis à jour",
      });
      
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling code status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du code",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copié !",
      description: `Le code ${code} a été copié dans le presse-papier`,
    });
  };

  const getTypeLabel = (type: string) => {
    return type === 'trial_month' ? 'Essai 1 mois' : 'Abonnement à vie';
  };

  const getTypeBadgeColor = (type: string) => {
    return type === 'trial_month' ? 'bg-blue-500' : 'bg-purple-500';
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [user]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Gestion des codes promo</h3>
          <p className="text-sm text-muted-foreground">
            Créez et gérez vos codes d'essai gratuit et abonnements à vie
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Créer un code</TabsTrigger>
          <TabsTrigger value="manage">Gérer les codes ({promoCodes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code promo</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newCode.code}
                    onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="MONCODE123"
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={generateRandomCode}>
                    Générer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type d'abonnement</Label>
                <Select 
                  value={newCode.type} 
                  onValueChange={(value: 'trial_month' | 'lifetime_free') => 
                    setNewCode(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial_month">Essai gratuit 1 mois (Plan Pro)</SelectItem>
                    <SelectItem value="lifetime_free">Abonnement à vie (Plan Enterprise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCode.description}
                  onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du code promo..."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max_uses">Nombre d'utilisations maximum</Label>
                <Input
                  id="max_uses"
                  type="number"
                  value={newCode.max_uses}
                  onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Date d'expiration (optionnel)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <Button 
                onClick={createPromoCode}
                disabled={!newCode.code.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer le code promo
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          {promoCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun code promo créé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {promoCodes.map((code) => (
                <Card key={code.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-mono font-bold px-2 py-1 bg-muted rounded">
                          {code.code}
                        </code>
                        <Badge className={`text-white ${getTypeBadgeColor(code.type)}`}>
                          {getTypeLabel(code.type)}
                        </Badge>
                        <Badge variant={code.is_active ? "default" : "secondary"}>
                          {code.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      
                      {code.description && (
                        <p className="text-sm text-muted-foreground mb-2">{code.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {code.current_uses} / {code.max_uses || '∞'} utilisations
                        </span>
                        {code.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expire le {format(new Date(code.expires_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </span>
                        )}
                        <span>
                          Créé le {format(new Date(code.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={code.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleCodeStatus(code.id, code.is_active)}
                      >
                        {code.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default PromoCodeManagement;