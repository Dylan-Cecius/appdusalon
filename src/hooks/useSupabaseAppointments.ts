import { cancelledAppointment, confirmedCancellation, confirmedSettlement } from '@/lib/appointmentMutationResults';
import { persistAppointmentContactUpdate, AppointmentContactError, type AppointmentContactUpdates } from '@/lib/appointmentContactUpdate';
import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Appointment, type AppointmentSegment } from '@/data/appointments';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';

const appointmentErrorDescription = (error: unknown, action: 'add' | 'update') => {
  if (error instanceof AppointmentContactError) return error.message;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';

  if (message.includes('staff_unavailable')) return 'Ce collaborateur est indisponible sur cette période.';
  if (message.includes('outside_opening_hours')) return 'Le rendez-vous dépasse les horaires ou recouvre une pause du salon.';
  if (message.includes('outside_staff_hours')) return 'Ce collaborateur ne travaille pas sur toute cette période.';
  if (message.includes('invalid_staff')) return 'Ce collaborateur n’est plus disponible dans ce salon.';
  if (message.includes('appointment_not_movable')) return 'Ce rendez-vous ne peut plus être déplacé. Actualisez l’agenda.';
  if (message.includes('invalid_appointment_duration') || message.includes('invalid_appointment_time')) return 'Conservez la durée réservée et choisissez un créneau sur une seule journée.';

  if (message.includes('appointment_conflict') || message.includes('23P01')) {
    return 'Ce créneau est déjà occupé pour ce membre de l’équipe.';
  }

  if (message.includes('service_not_found')) {
    return 'Une prestation sélectionnée n’est plus disponible.';
  }

  if (message.includes('invalid_service_id')) {
    return 'Une prestation sélectionnée est invalide.';
  }

  if (message.includes('invalid_service_duration')) {
    return 'La durée de la prestation est invalide.';
  }

  if (message.includes('salon_access_denied')) {
    return 'Votre accès à ce salon n’est plus actif.';
  }

  return action === 'add'
    ? "Impossible d'ajouter le rendez-vous"
    : 'Impossible de mettre à jour le rendez-vous';
};


export const useSupabaseAppointments = () => {
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const fetchAppointments = async () => {
    console.log('[Appointments] fetch start');
    setLoading(true);
    setError(false);
    try {
      if (!isSupabaseConfigured || !user || !salonId) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const [{ data, error }, { data: segmentData, error: segmentError }] = await Promise.all([supabase
        .from('appointments' as any)
        .select(`
          id,
          barber_id,
          staff_id,
          client_name,
          client_phone,
          start_time,
          end_time,
          services,
          total_price,
          status,
          is_paid,
          payment_status,
          deposit_required,
          amount_paid,
          payment_expires_at,
          recurrence_group_id,
          recurrence_index,
          recurrence_frequency,
          recurrence_interval,
          recurrence_total,
          notes,
          created_at,
          updated_at
        `)
        .eq('salon_id', salonId)
        .order('start_time', { ascending: true }),
        supabase.from('appointment_segments')
          .select('id, appointment_id, segment_type, label, starts_at, ends_at, occupies_staff')
          .eq('salon_id', salonId)
          .order('position', { ascending: true }),
      ]);

      if (error) throw error;
      // Older backends can still show appointments before the segments migration.
      if (segmentError) console.warn('[Appointments] segment details unavailable:', segmentError.message);
      const segmentsByAppointment = new Map<string, AppointmentSegment[]>();
      for (const segment of segmentData || []) {
        const segments = segmentsByAppointment.get(segment.appointment_id) || [];
        segments.push({ id: segment.id, type: segment.segment_type as AppointmentSegment['type'], label: segment.label,
          startTime: new Date(segment.starts_at), endTime: new Date(segment.ends_at), occupiesStaff: segment.occupies_staff });
        segmentsByAppointment.set(segment.appointment_id, segments);
      }

      const formattedAppointments = data?.map((apt: any) => ({
        id: apt.id,
        updatedAt: apt.updated_at,
        clientName: apt.client_name || 'Client',
        clientPhone: apt.client_phone || '',
        services: apt.services as any,
        startTime: new Date(apt.start_time),
        endTime: new Date(apt.end_time),
        status: apt.status as Appointment['status'],
        totalPrice: apt.total_price,
        paymentStatus: apt.payment_status as Appointment['paymentStatus'],
        depositRequired: Number(apt.deposit_required || 0),
        amountPaid: Number(apt.amount_paid || 0),
        paymentExpiresAt: apt.payment_expires_at ? new Date(apt.payment_expires_at) : undefined,
        recurrenceGroupId: apt.recurrence_group_id || undefined,
        recurrenceIndex: apt.recurrence_index ?? undefined,
        recurrenceFrequency: apt.recurrence_frequency || undefined,
        recurrenceInterval: apt.recurrence_interval ?? undefined,
        recurrenceTotal: apt.recurrence_total ?? undefined,
        notes: apt.notes,
        isPaid: apt.is_paid,
        barberId: apt.barber_id || undefined,
        staffId: apt.staff_id || undefined,
        segments: segmentsByAppointment.get(apt.id) || [],
      })) || [];

      console.log('[Appointments] fetch success', formattedAppointments.length);
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('[Appointments] fetch error:', error);
      setError(true);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getClientDetails = async (appointmentId: string) => {
    try {
      if (!isSupabaseConfigured) {
        return { clientName: 'Client', clientPhone: '***-***-****' };
      }

      const { data, error } = await supabase
        .rpc('get_appointment_client_details', { appointment_id: appointmentId });

      if (error) throw error;

      return {
        clientName: data?.[0]?.client_name || 'Client',
        clientPhone: data?.[0]?.client_phone || '***-***-****'
      };
    } catch (error) {
      console.error('Error fetching client details:', error);
      return { clientName: 'Client', clientPhone: '***-***-****' };
    }
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      if (!isSupabaseConfigured) {
        const newAppointment: Appointment = {
          ...appointment,
          id: Date.now().toString()
        };
        setAppointments(prev => [...prev, newAppointment]);
        toast({ title: "Succès", description: "Rendez-vous ajouté (mode local)" });
        return newAppointment;
      }

      if (!user) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      const { data, error } = await supabase
        .from('appointments' as any)
        .insert({
          client_name: appointment.clientName,
          client_phone: appointment.clientPhone || '',
          services: appointment.services as any,
          start_time: appointment.startTime.toISOString(),
          end_time: appointment.endTime.toISOString(),
          status: appointment.status,
          total_price: appointment.totalPrice,
          notes: appointment.notes,
          is_paid: appointment.isPaid,
          barber_id: appointment.barberId || null,
          staff_id: appointment.staffId || null,
          user_id: user.id,
          salon_id: salonId
        })
        .select(`id, barber_id, staff_id, start_time, end_time, services, total_price, status, is_paid, notes`)
        .single();

      if (error) throw error;

      const newAppointment: Appointment = {
        id: (data as any).id,
        clientName: 'Client',
        clientPhone: '***-***-****',
        services: (data as any).services as any,
        startTime: new Date((data as any).start_time),
        endTime: new Date((data as any).end_time),
        status: (data as any).status as Appointment['status'],
        totalPrice: (data as any).total_price,
        notes: (data as any).notes,
        isPaid: (data as any).is_paid,
        barberId: (data as any).barber_id || undefined,
        staffId: (data as any).staff_id || undefined
      };

      setAppointments(prev => [...prev, newAppointment]);
      toast({ title: "Succès", description: "Rendez-vous ajouté avec succès" });

      return newAppointment;
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Rendez-vous impossible",
        description: appointmentErrorDescription(error, 'add'),
        variant: "destructive"
      });
      throw error;
    }
  };

  const addRecurringAppointments = async ({
    appointment,
    frequency,
    interval,
    occurrences,
  }: {
    appointment: Omit<Appointment, 'id'>;
    frequency: 'weekly' | 'monthly';
    interval: number;
    occurrences: number;
  }) => {
    try {
      if (!user) {
        throw new Error('not_authenticated');
      }

      if (!appointment.staffId) {
        throw new Error('invalid_staff');
      }

      const { data, error } = await (supabase as any).rpc(
        'create_recurring_appointments',
        {
          client_name_param: appointment.clientName,
          client_phone_param: appointment.clientPhone || '',
          services_param: appointment.services as any,
          first_start_param: appointment.startTime.toISOString(),
          first_end_param: appointment.endTime.toISOString(),
          staff_id_param: appointment.staffId,
          notes_param: appointment.notes || null,
          frequency_param: frequency,
          interval_param: interval,
          occurrences_param: occurrences,
        }
      );

      if (error) throw error;

      await fetchAppointments();

      toast({
        title: 'Série créée',
        description: `${occurrences} rendez-vous ont été planifiés.`,
      });

      return data;
    } catch (error) {
      console.error('Error adding recurring appointments:', error);
      toast({
        title: 'Série impossible',
        description:
          'La série n’a pas été créée. Vérifiez les créneaux et les disponibilités.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const moveAppointment = async (original: Appointment, candidate: Appointment) => {
    if (!user || !salonId || !original.updatedAt) throw new Error('Actualisez l’agenda avant de déplacer ce rendez-vous.');
    const { data, error } = await supabase.from('appointments' as any)
      .update({ start_time: candidate.startTime.toISOString(), end_time: candidate.endTime.toISOString(), staff_id: candidate.staffId })
      .eq('id', original.id).eq('salon_id', salonId).eq('updated_at', original.updatedAt)
      .select('id').maybeSingle();
    if (error) throw new Error(appointmentErrorDescription(error, 'update'));
    if (!data) throw new Error('Ce rendez-vous a changé ou n’est plus accessible. Actualisez l’agenda et réessayez.');
    await fetchAppointments();
  };

  const updateAppointment = async (id: string, updates: AppointmentContactUpdates, original: Appointment) => {
    try {
      if (!user || !salonId || original.id !== id) throw new AppointmentContactError('Actualisez l’agenda avant de modifier ce rendez-vous.');
      const saved = await persistAppointmentContactUpdate(supabase, salonId, original, updates);
      setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...saved } : apt));
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Modification impossible",
        description: appointmentErrorDescription(error, 'update'),
        variant: "destructive"
      });
      throw error;
    }
  };

  const cancelAppointment = async (
    id: string,
    action: 'cancel' | 'no_show' = 'cancel',
    reason = ''
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-appointment', {
        body: {
          appointment_id: id,
          action,
          reason,
        },
      });

      if (error) throw error;

      const result = confirmedCancellation(data);
      setAppointments(prev => prev.map(appointment => appointment.id === id ? cancelledAppointment(appointment, result) : appointment));

      if (result.alreadyClosed) {
        toast({ title: 'Rendez-vous déjà clos',
          description: result.refundStatus === 'failed' ? 'Le rendez-vous est déjà clos, mais son remboursement doit être vérifié.'
            : result.status === 'cancelled' ? 'Ce rendez-vous est déjà annulé.' : 'Ce rendez-vous est déjà marqué absent.',
          variant: result.refundStatus === 'failed' ? 'destructive' : 'default',
        });
        return data;
      }

      if (result.status === 'no_show') {
        toast({
          title: "No-show enregistré",
          description:
            (result.depositKept || 0) > 0
              ? `L'acompte de ${result.depositKept!.toFixed(2)} € est conservé.`
              : "Le rendez-vous a été marqué comme non honoré.",
        });
      } else {
        const refundStatus = result.refundStatus;
        const refundAmount = result.refundAmount;

        toast({
          title: "Rendez-vous annulé",
          description:
            refundStatus === 'refunded'
              ? refundAmount !== undefined ? `Remboursement de ${refundAmount.toFixed(2)} € effectué.` : 'Remboursement confirmé.'
              : refundStatus === 'failed'
                ? "Le rendez-vous est annulé, mais le remboursement doit être vérifié."
                : "Le créneau est de nouveau disponible.",
          variant: refundStatus === 'failed' ? 'destructive' : 'default',
        });
      }

      return data;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: action === 'no_show' ? "No-show impossible" : "Annulation impossible",
        description: "Impossible de mettre à jour ce rendez-vous.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.filter(apt => apt.id !== id));
      toast({ title: "Succès", description: "Rendez-vous supprimé avec succès" });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer le rendez-vous", variant: "destructive" });
      throw error;
    }
  };

  const markAsPaid = async (id: string, method: 'cash' | 'card') => {
    try {
      if (!user || !salonId) throw new Error('salon_access_denied');
      const { data, error } = await (supabase as any).rpc('settle_appointment', {
        appointment_id_param: id,
        payment_method_param: method,
      });
      if (error) throw error;
      const result = confirmedSettlement(data, id, salonId);
      setAppointments(prev => prev.map(appointment => appointment.id === id ? { ...appointment, ...result.patch } : appointment));
      toast({
        title: result.prepaid ? 'Prestation clôturée' : 'Paiement enregistré',
        description: result.prepaid ? 'La prestation prépayée est clôturée, sans nouvel encaissement.' : 'Le règlement confirmé est visible en caisse.',
      });
    } catch (error) {
      console.error('Error settling appointment:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message || '')
            : '';

      let description = "Impossible d’encaisser ce rendez-vous";
      if (message.includes('appointment_already_paid')) {
        description = "Ce rendez-vous a déjà été encaissé.";
      } else if (message.includes('appointment_cancelled')) {
        description = "Un rendez-vous annulé ne peut pas être encaissé.";
      } else if (message.includes('appointment_not_billable')) {
        description = "Ce rendez-vous ne contient aucune prestation facturable.";
      }

      toast({
        title: "Encaissement impossible",
        description,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.startTime.toDateString() === date.toDateString()
    );
  };

  // Gate on auth readiness
  useEffect(() => {
    if (!isReady) return;

    if (!user || !salonId) {
      setAppointments([]);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    console.log('[Appointments] effect trigger — fetching for salon', salonId);
    setLoading(true);
    fetchAppointments();

    if (!isSupabaseConfigured) return;

    const subscription = supabase
      .channel(`appointments-${salonId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `salon_id=eq.${salonId}`,
        },
        () => { void fetchAppointments(); }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isReady, user?.id, salonId]);

  return {
    appointments,
    loading,
    error,
    addAppointment,
    addRecurringAppointments,
    updateAppointment,
    moveAppointment,
    deleteAppointment,
    cancelAppointment,
    markAsPaid,
    getAppointmentsForDate,
    getClientDetails,
    refreshAppointments: fetchAppointments
  };
};
