import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Coffee,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  Package,
  Plus,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useSupabaseServices,
  type Service,
  type ServiceStep,
} from '@/hooks/useSupabaseServices';
import { cn } from '@/lib/utils';

const STEP_META: Record<
  ServiceStep['type'],
  { label: string; description: string; className: string }
> = {
  work: {
    label: 'Travail',
    description: 'Le collaborateur est occupé',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  pause: {
    label: 'Pause / pose',
    description: 'Le collaborateur redevient disponible',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  cleanup: {
    label: 'Nettoyage',
    description: 'Bloque l’agenda, invisible par défaut',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

const createStep = (type: ServiceStep['type'] = 'work'): ServiceStep => ({
  name:
    type === 'pause'
      ? 'Temps de pose'
      : type === 'cleanup'
        ? 'Nettoyage'
        : 'Étape de travail',
  type,
  duration: type === 'pause' ? 30 : 15,
  customerVisible: type !== 'cleanup',
});

const ServiceManagement = () => {
  const {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    categories,
  } = useSupabaseServices();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceSteps, setServiceSteps] = useState<ServiceStep[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    category: 'general',
    appointmentBuffer: '10',
    color: '#6B7280',
    bookingPaymentMode: 'none' as Service['bookingPaymentMode'],
    bookingPaymentValue: '0',
    cancellationDeadlineHours: '24',
    lateCancellationPolicy: 'keep_deposit' as Service['lateCancellationPolicy'],
  });

  const categoryDefaultColors: Record<string, string> = {
    coupe: '#10B981',
    coloration: '#8B5CF6',
    couleur: '#8B5CF6',
    barbe: '#3B82F6',
    soin: '#EC4899',
    combo: '#F97316',
    produit: '#6B7280',
    general: '#6B7280',
  };

  const stepTotals = useMemo(() => {
    const total = serviceSteps.reduce((sum, step) => sum + Number(step.duration || 0), 0);
    const pause = serviceSteps
      .filter((step) => step.type === 'pause')
      .reduce((sum, step) => sum + Number(step.duration || 0), 0);
    const occupied = total - pause;

    return { total, pause, occupied };
  }, [serviceSteps]);

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: '',
      category: 'general',
      appointmentBuffer: '10',
      color: '#6B7280',
      bookingPaymentMode: 'none',
      bookingPaymentValue: '0',
      cancellationDeadlineHours: '24',
      lateCancellationPolicy: 'keep_deposit',
    });
    setServiceSteps([]);
    setEditingService(null);
  };

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        price: service.price.toString(),
        duration: service.duration.toString(),
        category: service.category,
        appointmentBuffer: service.appointmentBuffer.toString(),
        color: service.color || '#6B7280',
        bookingPaymentMode: service.bookingPaymentMode || 'none',
        bookingPaymentValue: String(service.bookingPaymentValue || 0),
        cancellationDeadlineHours: String(service.cancellationDeadlineHours ?? 24),
        lateCancellationPolicy: service.lateCancellationPolicy || 'keep_deposit',
      });
      setServiceSteps(service.steps.map((step) => ({ ...step })));
    } else {
      resetForm();
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const addStep = (type: ServiceStep['type']) => {
    setServiceSteps((previous) => [...previous, createStep(type)]);
  };

  const updateStep = (index: number, updates: Partial<ServiceStep>) => {
    setServiceSteps((previous) =>
      previous.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...updates } : step
      )
    );
  };

  const removeStep = (index: number) => {
    setServiceSteps((previous) =>
      previous.filter((_, stepIndex) => stepIndex !== index)
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= serviceSteps.length) return;

    setServiceSteps((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.price) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    if (serviceSteps.length === 0 && !formData.duration) {
      toast({
        title: 'Durée manquante',
        description: 'Indiquez une durée ou configurez des étapes.',
        variant: 'destructive',
      });
      return;
    }

    if (
      serviceSteps.some(
        (step) =>
          !step.name.trim() ||
          !Number.isFinite(Number(step.duration)) ||
          Number(step.duration) < 1
      )
    ) {
      toast({
        title: 'Étapes incomplètes',
        description: 'Chaque étape doit avoir un nom et une durée valide.',
        variant: 'destructive',
      });
      return;
    }

    const parsedPrice = parseFloat(formData.price);
    const parsedPaymentValue = parseFloat(formData.bookingPaymentValue) || 0;

    if (
      formData.bookingPaymentMode === 'deposit_percent' &&
      (parsedPaymentValue <= 0 || parsedPaymentValue > 100)
    ) {
      toast({
        title: 'Acompte invalide',
        description: "Le pourcentage d'acompte doit être compris entre 1 et 100 %.",
        variant: 'destructive',
      });
      return;
    }

    if (
      formData.bookingPaymentMode === 'deposit_fixed' &&
      (parsedPaymentValue <= 0 || parsedPaymentValue > parsedPrice)
    ) {
      toast({
        title: 'Acompte invalide',
        description:
          "L'acompte fixe doit être supérieur à 0 € et ne peut pas dépasser le prix de la prestation.",
        variant: 'destructive',
      });
      return;
    }

    const serviceData: Omit<Service, 'id'> = {
      name: formData.name.trim(),
      price: parsedPrice,
      duration:
        serviceSteps.length > 0
          ? stepTotals.total
          : Math.max(1, parseInt(formData.duration, 10) || 1),
      category: formData.category,
      appointmentBuffer: parseInt(formData.appointmentBuffer, 10) || 0,
      isActive: true,
      displayOrder: editingService?.displayOrder ?? services.length + 1,
      color: formData.color,
      bookingPaymentMode: formData.bookingPaymentMode,
      bookingPaymentValue:
        formData.bookingPaymentMode === 'none' ||
        formData.bookingPaymentMode === 'full'
          ? 0
          : parsedPaymentValue,
      cancellationDeadlineHours: Math.max(
        0,
        parseInt(formData.cancellationDeadlineHours, 10) || 0
      ),
      lateCancellationPolicy: formData.lateCancellationPolicy,
      steps: serviceSteps.map((step) => ({
        name: step.name.trim(),
        type: step.type,
        duration: Number(step.duration),
        customerVisible: step.customerVisible,
      })),
    };

    try {
      if (editingService) {
        await updateService(editingService.id, serviceData);
        toast({
          title: 'Service modifié',
          description: `${formData.name} a été mis à jour.`,
        });
      } else {
        await addService(serviceData);
        toast({
          title: 'Service ajouté',
          description: `${formData.name} a été ajouté au catalogue.`,
        });
      }

      handleCloseModal();
    } catch (error) {
      console.error('Service save failed:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le service.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${service.name}" ?`)) {
      return;
    }

    try {
      await deleteService(service.id);
      toast({
        title: 'Service supprimé',
        description: `${service.name} a été retiré du catalogue.`,
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le service.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-muted" />
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-12 rounded bg-muted" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Services & forfaits</h3>
              <p className="text-sm text-muted-foreground">
                Prestations simples, forfaits multi-étapes et règles de réservation.
              </p>
            </div>
          </div>

          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service
          </Button>
        </div>

        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: service.color || '#6B7280',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{service.name}</h4>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium">
                    {categories.find((category) => category.id === service.category)?.name ||
                      service.category}
                  </span>
                  {service.steps.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                      <Sparkles className="h-3 w-3" />
                      {service.steps.length} étapes
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {service.price.toFixed(2)} € · {service.duration} min
                  {service.appointmentBuffer > 0 &&
                    ` · +${service.appointmentBuffer} min nettoyage`}
                </div>

                {service.steps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {service.steps.map((step, index) => (
                      <span
                        key={`${step.name}-${index}`}
                        className={cn(
                          'rounded-full border px-2 py-1 text-[10px] font-semibold',
                          STEP_META[step.type].className
                        )}
                      >
                        {step.name} · {step.duration} min
                      </span>
                    ))}
                  </div>
                )}

                {service.bookingPaymentMode !== 'none' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      <CreditCard className="h-3 w-3" />
                      {service.bookingPaymentMode === 'full'
                        ? 'Paiement complet'
                        : service.bookingPaymentMode === 'deposit_percent'
                          ? `Acompte ${service.bookingPaymentValue}%`
                          : `Acompte ${service.bookingPaymentValue.toFixed(2)} €`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Annulation {service.cancellationDeadlineHours} h avant
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 self-end sm:self-auto">
                <Button size="sm" variant="outline" onClick={() => handleOpenModal(service)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(service)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Package className="mx-auto mb-4 h-10 w-10 opacity-40" />
              <p className="font-medium">Aucun service configuré</p>
              <p className="mt-1 text-sm">Ajoutez votre première prestation.</p>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nom du service *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="Ex. Coloration + brushing"
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Prix (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(event) =>
                    setFormData({ ...formData, price: event.target.value })
                  }
                  placeholder="85.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Durée simple (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={serviceSteps.length > 0 ? String(stepTotals.total) : formData.duration}
                  onChange={(event) =>
                    setFormData({ ...formData, duration: event.target.value })
                  }
                  disabled={serviceSteps.length > 0}
                  placeholder="45"
                />
                {serviceSteps.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Calculée automatiquement à partir des étapes.
                  </p>
                )}
              </div>

              <div>
                <Label>Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value,
                      color:
                        formData.color === categoryDefaultColors[formData.category]
                          ? categoryDefaultColors[value] || '#6B7280'
                          : formData.color,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Couleur agenda</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(event) =>
                      setFormData({ ...formData, color: event.target.value })
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-border"
                  />
                  <span className="text-sm text-muted-foreground">{formData.color}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <Label className="font-semibold">Déroulé de la prestation</Label>
                  </div>
                  <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                    Ajoutez des étapes pour libérer réellement le collaborateur pendant une
                    pose et bloquer uniquement les périodes de travail ou nettoyage.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => addStep('work')}>
                    <Timer className="mr-1.5 h-3.5 w-3.5" />
                    Travail
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addStep('pause')}>
                    <Coffee className="mr-1.5 h-3.5 w-3.5" />
                    Pause
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addStep('cleanup')}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Nettoyage
                  </Button>
                </div>
              </div>

              {serviceSteps.length > 0 ? (
                <>
                  <div className="mt-4 space-y-2">
                    {serviceSteps.map((step, index) => {
                      const meta = STEP_META[step.type];

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-border bg-card p-3 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => moveStep(index, -1)}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={index === serviceSteps.length - 1}
                                onClick={() => moveStep(index, 1)}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="min-w-0 flex-1">
                              <Input
                                value={step.name}
                                onChange={(event) =>
                                  updateStep(index, { name: event.target.value })
                                }
                                placeholder="Nom de l'étape"
                              />
                            </div>

                            <div className="w-full sm:w-40">
                              <Select
                                value={step.type}
                                onValueChange={(value: ServiceStep['type']) =>
                                  updateStep(index, {
                                    type: value,
                                    customerVisible:
                                      value === 'cleanup' ? false : step.customerVisible,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="work">Travail</SelectItem>
                                  <SelectItem value="pause">Pause / pose</SelectItem>
                                  <SelectItem value="cleanup">Nettoyage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-2 sm:w-32">
                              <Input
                                type="number"
                                min="1"
                                max="480"
                                value={step.duration}
                                onChange={(event) =>
                                  updateStep(index, {
                                    duration: Math.max(1, parseInt(event.target.value, 10) || 1),
                                  })
                                }
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeStep(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-0 sm:pl-[76px]">
                            <span
                              className={cn(
                                'rounded-full border px-2 py-1 text-[10px] font-semibold',
                                meta.className
                              )}
                            >
                              {meta.label} · {meta.description}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateStep(index, {
                                  customerVisible: !step.customerVisible,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
                            >
                              {step.customerVisible ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                              {step.customerVisible ? 'Visible client' : 'Masqué client'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-card p-3 text-center">
                      <div className="text-xl font-bold">{stepTotals.total} min</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Durée totale
                      </div>
                    </div>
                    <div className="rounded-xl bg-card p-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">
                        {stepTotals.occupied} min
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Collaborateur occupé
                      </div>
                    </div>
                    <div className="rounded-xl bg-card p-3 text-center">
                      <div className="text-xl font-bold text-amber-600">
                        {stepTotals.pause} min
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Temps libéré
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-card/60 p-5 text-center">
                  <p className="text-sm font-medium">Prestation simple</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajoutez une étape uniquement si cette prestation comporte une pose,
                    plusieurs phases ou un nettoyage dédié.
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="buffer">Nettoyage / préparation après prestation (min)</Label>
              <Input
                id="buffer"
                type="number"
                min="0"
                value={formData.appointmentBuffer}
                onChange={(event) =>
                  setFormData({ ...formData, appointmentBuffer: event.target.value })
                }
                placeholder="10"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Bloque l’agenda après le service sans apparaître comme une prestation
                supplémentaire pour le client.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <Label className="font-semibold">Paiement à la réservation</Label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sécurisez les rendez-vous en ligne avec un acompte ou un paiement complet.
                </p>
              </div>

              <div>
                <Label>Mode de paiement</Label>
                <Select
                  value={formData.bookingPaymentMode}
                  onValueChange={(value: Service['bookingPaymentMode']) =>
                    setFormData({ ...formData, bookingPaymentMode: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun paiement demandé</SelectItem>
                    <SelectItem value="deposit_fixed">Acompte fixe (€)</SelectItem>
                    <SelectItem value="deposit_percent">Acompte en pourcentage</SelectItem>
                    <SelectItem value="full">Paiement complet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.bookingPaymentMode === 'deposit_fixed' ||
                formData.bookingPaymentMode === 'deposit_percent') && (
                <div>
                  <Label htmlFor="bookingPaymentValue">
                    {formData.bookingPaymentMode === 'deposit_percent'
                      ? "Pourcentage d'acompte (%)"
                      : "Montant de l'acompte (€)"}
                  </Label>
                  <Input
                    id="bookingPaymentValue"
                    className="mt-1"
                    type="number"
                    min="0"
                    max={
                      formData.bookingPaymentMode === 'deposit_percent' ? 100 : undefined
                    }
                    step={
                      formData.bookingPaymentMode === 'deposit_percent' ? 1 : 0.01
                    }
                    value={formData.bookingPaymentValue}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        bookingPaymentValue: event.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="cancellationDeadlineHours">
                  Annulation gratuite jusqu'à
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="cancellationDeadlineHours"
                    type="number"
                    min="0"
                    max="720"
                    value={formData.cancellationDeadlineHours}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        cancellationDeadlineHours: event.target.value,
                      })
                    }
                  />
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    heures avant
                  </span>
                </div>
              </div>

              {formData.bookingPaymentMode !== 'none' && (
                <div>
                  <Label>En cas d'annulation tardive</Label>
                  <Select
                    value={formData.lateCancellationPolicy}
                    onValueChange={(value: Service['lateCancellationPolicy']) =>
                      setFormData({
                        ...formData,
                        lateCancellationPolicy: value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep_deposit">Conserver l'acompte</SelectItem>
                      <SelectItem value="refund_deposit">Rembourser l'acompte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                {editingService ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceManagement;
