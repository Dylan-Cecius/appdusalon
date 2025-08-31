import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Users, 
  Calendar, 
  CreditCard, 
  Scissors, 
  BarChart3, 
  Mail, 
  Package, 
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useSubscriptionRights } from "@/hooks/useSubscriptionRights";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useSupabaseAppointments } from "@/hooks/useSupabaseAppointments";
import { useSupabaseTransactions } from "@/hooks/useSupabaseTransactions";
import { useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

interface SubscriptionRightsDisplayProps {
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
}

export const SubscriptionRightsDisplay = ({ 
  showUpgradeButton = true, 
  onUpgrade 
}: SubscriptionRightsDisplayProps) => {
  const { rights, subscriptionTier, canAccess, getLimit, isWithinLimit, getRemainingUsage } = useSubscriptionRights();
  const { barbers } = useSupabaseSettings();
  const { appointments } = useSupabaseAppointments();
  const { transactions } = useSupabaseTransactions();

  // Calcul des utilisations actuelles
  const currentUsage = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyAppointments = appointments.filter(apt => 
      apt.startTime >= monthStart && apt.startTime <= monthEnd
    ).length;

    const monthlyTransactions = transactions.filter(trans => 
      new Date(trans.transactionDate) >= monthStart && 
      new Date(trans.transactionDate) <= monthEnd
    ).length;

    const activeBarbers = barbers.filter(b => b.is_active);
    const maxServicesPerBarber = activeBarbers.length > 0 
      ? Math.max(...activeBarbers.map(b => 
          appointments.filter(apt => apt.barberId === b.id).length
        ))
      : 0;

    return {
      barbers: activeBarbers.length,
      monthlyAppointments,
      monthlyTransactions,
      servicesPerBarber: maxServicesPerBarber
    };
  }, [barbers, appointments, transactions]);

  const formatLimit = (limit: number) => {
    return limit === Number.POSITIVE_INFINITY ? "Illimité" : limit.toString();
  };

  const getUsageColor = (current: number, max: number) => {
    if (max === Number.POSITIVE_INFINITY) return "text-green-600";
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const getProgressValue = (current: number, max: number) => {
    if (max === Number.POSITIVE_INFINITY) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const tierColors = {
    'none': 'bg-gray-100 text-gray-800',
    'Basic': 'bg-blue-100 text-blue-800',
    'Premium': 'bg-purple-100 text-purple-800',
    'Enterprise': 'bg-green-100 text-green-800',
    'Lifetime': 'bg-gradient-to-r from-gold-400 to-gold-600 text-white'
  };

  const isNearLimit = (current: number, limit: number) => {
    if (limit === Number.POSITIVE_INFINITY) return false;
    return (current / limit) >= 0.8;
  };

  const isUnlimited = (limit: number) => {
    return limit === Number.POSITIVE_INFINITY;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec tier actuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Droits d'abonnement</CardTitle>
                <CardDescription>Plan actuel et limitations</CardDescription>
              </div>
            </div>
            <Badge className={tierColors[subscriptionTier as keyof typeof tierColors]}>
              {subscriptionTier === 'none' ? 'Aucun abonnement' : `Plan ${subscriptionTier}`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Alertes si proche des limites */}
      {isNearLimit(currentUsage.barbers, getLimit('maxBarbers')) && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Vous approchez de la limite de coiffeurs ({currentUsage.barbers}/{formatLimit(getLimit('maxBarbers'))}).
          </AlertDescription>
        </Alert>
      )}

      {/* Limites d'utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Limites d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coiffeurs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Coiffeurs</span>
              </div>
              <span className={`text-sm font-medium ${getUsageColor(currentUsage.barbers, getLimit('maxBarbers'))}`}>
                {currentUsage.barbers} / {formatLimit(getLimit('maxBarbers'))}
              </span>
            </div>
            {!isUnlimited(getLimit('maxBarbers')) && (
              <Progress 
                value={getProgressValue(currentUsage.barbers, getLimit('maxBarbers'))} 
                className="h-2" 
              />
            )}
          </div>

          {/* RDV mensuels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">RDV ce mois</span>
              </div>
              <span className={`text-sm font-medium ${getUsageColor(currentUsage.monthlyAppointments, getLimit('maxAppointmentsPerMonth'))}`}>
                {currentUsage.monthlyAppointments} / {formatLimit(getLimit('maxAppointmentsPerMonth'))}
              </span>
            </div>
            {!isUnlimited(getLimit('maxAppointmentsPerMonth')) && (
              <Progress 
                value={getProgressValue(currentUsage.monthlyAppointments, getLimit('maxAppointmentsPerMonth'))} 
                className="h-2" 
              />
            )}
          </div>

          {/* Transactions mensuelles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Transactions ce mois</span>
              </div>
              <span className={`text-sm font-medium ${getUsageColor(currentUsage.monthlyTransactions, getLimit('maxTransactionsPerMonth'))}`}>
                {currentUsage.monthlyTransactions} / {formatLimit(getLimit('maxTransactionsPerMonth'))}
              </span>
            </div>
            {!isUnlimited(getLimit('maxTransactionsPerMonth')) && (
              <Progress 
                value={getProgressValue(currentUsage.monthlyTransactions, getLimit('maxTransactionsPerMonth'))} 
                className="h-2" 
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fonctionnalités disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fonctionnalités disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'canAccessAdvancedStats', label: 'Statistiques avancées', icon: BarChart3 },
              { key: 'canExportReports', label: 'Export de rapports', icon: Package },
              { key: 'canSendEmails', label: 'Envoi d\'emails', icon: Mail },
              { key: 'canManageInventory', label: 'Gestion des stocks', icon: Package },
              { key: 'canAccessMultiSalon', label: 'Multi-salons', icon: Users },
              { key: 'canAccessAPI', label: 'Accès API', icon: Crown },
              { key: 'canRemoveBranding', label: 'Retrait du branding', icon: Crown },
              { key: 'canCustomizeDomain', label: 'Domaine personnalisé', icon: Crown },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{label}</span>
                {canAccess(key as any) ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Support inclus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium capitalize">{rights.supportLevel}</p>
              <p className="text-sm text-muted-foreground">
                {rights.supportLevel === 'community' && 'Support communautaire'}
                {rights.supportLevel === 'email' && 'Support par email'}
                {rights.supportLevel === 'priority' && 'Support prioritaire'}
                {rights.supportLevel === 'dedicated' && 'Support dédié'}
              </p>
            </div>
            {rights.hasCustomTraining && (
              <Badge variant="secondary">Formation incluse</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bouton d'upgrade */}
      {showUpgradeButton && subscriptionTier !== 'Lifetime' && subscriptionTier !== 'Enterprise' && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <Crown className="h-8 w-8 text-primary mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Débloquez plus de fonctionnalités</h3>
              <p className="text-muted-foreground">
                Passez à un plan supérieur pour accéder à plus de fonctionnalités et augmenter vos limites.
              </p>
            </div>
            <Button onClick={onUpgrade} className="w-full">
              Voir les plans d'abonnement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};