import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStaff } from '@/hooks/useStaff';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';

const OnboardingChecklist = () => {
  const { activeStaff, isLoading: staffLoading } = useStaff();
  const { services, loading: servicesLoading } = useSupabaseServices();
  const { hasData: hasOpeningHours } = useOpeningHours();
  const { salonSettings, loading: settingsLoading } = useSupabaseSettings();

  if (staffLoading || servicesLoading || settingsLoading) return null;

  const hasSalonIdentity =
    Boolean(salonSettings?.name?.trim()) &&
    salonSettings?.name?.trim().toLowerCase() !== "l'app du salon";

  const steps = [
    {
      label: 'Personnaliser le salon',
      description: 'Nom et réglages essentiels',
      complete: hasSalonIdentity,
      href: '/parametres',
    },
    {
      label: 'Définir les horaires',
      description: "Heures d'ouverture et pauses",
      complete: hasOpeningHours,
      href: '/parametres',
    },
    {
      label: "Configurer l'équipe",
      description: 'Membres, rôles et horaires',
      complete: activeStaff.length > 0,
      href: '/equipe',
    },
    {
      label: 'Ajouter les prestations',
      description: 'Services, prix et durées',
      complete: services.some(service => service.isActive !== false),
      href: '/services',
    },
  ];

  const completed = steps.filter(step => step.complete).length;
  const percentage = Math.round((completed / steps.length) * 100);

  if (completed === steps.length) return null;

  const nextStep = steps.find(step => !step.complete);

  return (
    <Card className="v2-panel overflow-hidden border-primary/20 bg-primary/[0.025]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">Premiers pas</span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight">Configurez votre salon</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {completed}/{steps.length} étapes terminées · {percentage}% configuré
            </p>
            <Progress value={percentage} className="mt-4 h-2 max-w-xl" />
          </div>

          {nextStep && (
            <Button asChild className="shrink-0 rounded-xl">
              <Link to={nextStep.href}>
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid border-t border-border/70 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Link
              key={step.label}
              to={step.href}
              className="flex items-start gap-3 border-b border-border/70 p-4 transition-colors hover:bg-muted/40 sm:border-r lg:border-b-0"
            >
              {step.complete ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{index + 1}. {step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
