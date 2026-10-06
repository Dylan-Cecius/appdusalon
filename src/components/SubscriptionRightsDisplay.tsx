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
  BarChart3,
  Mail,
  Package,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CalendarCheck,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { useSubscriptionRights } from "@/hooks/useSubscriptionRights";
import { useStaff } from "@/hooks/useStaff";
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
  onUpgrade,
}: SubscriptionRightsDisplayProps) => {
  const {
    rights,
    subscriptionTier,
    canAccess,
    getLimit,
    loading,
  } = useSubscriptionRights();
  const { activeStaff } = useStaff();
  const { appointments } = useSupabaseAppointments();
  const { transactions } = useSupabaseTransactions();

  const currentUsage = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyAppointments = appointments.filter(
      appointment =>
        appointment.startTime >= monthStart &&
        appointment.startTime <= monthEnd &&
        appointment.status !== "cancelled"
    ).length;

    const monthlyTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      return date >= monthStart && date <= monthEnd;
    }).length;

    return {
      staff: activeStaff.length,
      monthlyAppointments,
      monthlyTransactions,
    };
  }, [activeStaff, appointments, transactions]);

  const formatLimit = (limit: number) =>
    limit === Number.POSITIVE_INFINITY ? "Illimité" : String(limit);

  const usageColor = (current: number, max: number) => {
    if (max === Number.POSITIVE_INFINITY) return "text-green-600";
    const percentage = max > 0 ? (current / max) * 100 : 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const progressValue = (current: number, max: number) => {
    if (max === Number.POSITIVE_INFINITY) return 0;
    return Math.min(max > 0 ? (current / max) * 100 : 100, 100);
  };

  const staffLimit = getLimit("maxBarbers");
  const isNearStaffLimit =
    staffLimit !== Number.POSITIVE_INFINITY &&
    staffLimit > 0 &&
    currentUsage.staff / staffLimit >= 0.8;

  const tierClass =
    subscriptionTier === "Lifetime"
      ? "bg-primary text-primary-foreground"
      : subscriptionTier === "Equipe"
        ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
        : subscriptionTier === "Solo"
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "bg-muted text-muted-foreground";

  const featureRows = [
    { key: "canAccessOnlineBooking", label: "Réservation en ligne", icon: CalendarCheck },
    { key: "canUseSmsAutomations", label: "Rappels SMS automatiques", icon: MessageSquare },
    { key: "canAccessTargetedMarketing", label: "Campagnes marketing ciblées", icon: Megaphone },
    { key: "canAccessAdvancedStats", label: "Statistiques avancées", icon: BarChart3 },
    { key: "canExportReports", label: "Rapports avancés & automatisés", icon: Package },
    { key: "canSendEmails", label: "Envoi de rapports par email", icon: Mail },
    { key: "canManageInventory", label: "Gestion complète des stocks", icon: Package },
    { key: "canAccessMultiSalon", label: "Multi-salons", icon: Users },
  ] as const;

  if (loading) {
    return (
      <Card className="v2-panel">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Chargement de votre abonnement…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="v2-panel">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Votre plan</CardTitle>
                <CardDescription>Limites et fonctionnalités actuellement actives</CardDescription>
              </div>
            </div>
            <Badge className={tierClass}>
              {subscriptionTier === "none" ? "Plan Gratuit" : `Plan ${subscriptionTier}`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {isNearStaffLimit && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            Vous approchez de la limite d’équipe ({currentUsage.staff}/{formatLimit(staffLimit)}).
          </AlertDescription>
        </Alert>
      )}

      <Card className="v2-panel">
        <CardHeader>
          <CardTitle className="text-lg">Utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Membres actifs</span>
              </div>
              <span className={`text-sm font-medium ${usageColor(currentUsage.staff, staffLimit)}`}>
                {currentUsage.staff} / {formatLimit(staffLimit)}
              </span>
            </div>
            {staffLimit !== Number.POSITIVE_INFINITY && (
              <Progress value={progressValue(currentUsage.staff, staffLimit)} className="h-2" />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Rendez-vous ce mois
              </div>
              <p className="mt-2 text-2xl font-semibold">{currentUsage.monthlyAppointments}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Transactions ce mois
              </div>
              <p className="mt-2 text-2xl font-semibold">{currentUsage.monthlyTransactions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="v2-panel">
        <CardHeader>
          <CardTitle className="text-lg">Fonctionnalités</CardTitle>
          <CardDescription>Les accès réellement appliqués par votre plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {featureRows.map(({ key, label, icon: Icon }) => {
              const enabled = canAccess(key);
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl border bg-card/60 p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{label}</span>
                  {enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/60" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="v2-panel">
        <CardHeader>
          <CardTitle className="text-lg">Support inclus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">
                {rights.supportLevel === "community" && "Support standard"}
                {rights.supportLevel === "email" && "Support par email"}
                {rights.supportLevel === "priority" && "Support prioritaire"}
                {rights.supportLevel === "dedicated" && "Support dédié"}
              </p>
              <p className="text-sm text-muted-foreground">
                Le niveau de support suit automatiquement votre abonnement.
              </p>
            </div>
            {rights.hasCustomTraining && <Badge variant="secondary">Formation incluse</Badge>}
          </div>
        </CardContent>
      </Card>

      {showUpgradeButton && subscriptionTier !== "Lifetime" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-6 text-center">
            <Crown className="mx-auto h-8 w-8 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Besoin de plus ?</h3>
              <p className="text-sm text-muted-foreground">
                Comparez les plans pour débloquer davantage de fonctionnalités.
              </p>
            </div>
            <Button onClick={onUpgrade} className="w-full">
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
