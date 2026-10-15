import { addDays, format } from 'date-fns';
import type { Appointment, AppointmentSegment } from '@/data/appointments';
import type { Staff } from '@/hooks/useStaff';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import type { WaitlistService } from '@/lib/waitlistSlots';
import type { Service } from '@/data/services';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const previewMembers: Staff[] = ['Dylan', 'Marie', 'Thomas'].map((name, index) => ({
  id: `demo-staff-${index}`, name, auth_user_id: null, salon_id: 'preview',
  role: 'coiffeur', color: ['#4f46e5', '#db2777', '#059669'][index],
  phone: null, email: null, commission_rate: 0, is_active: true,
  start_time: '09:00', end_time: '19:00', working_days: dayNames,
  daily_schedules: Object.fromEntries(dayNames.map(day => [day, { start: '09:00', end: '19:00' }])),
  created_at: '2026-01-01T00:00:00Z',
}));
export const agendaServices: (WaitlistService & { color: string; category: 'coupe' | 'combo' })[] = [
  { id: 'demo-coupe', name: 'Coupe homme', price: 25, duration: 30, category: 'coupe' as const, color: '#4f46e5' },
  { id: 'demo-barbe', name: 'Coupe + barbe', price: 35, duration: 45, category: 'combo' as const, color: '#059669' },
  { id: 'demo-couleur', name: 'Coloration & soin', price: 75, duration: 90, category: 'coupe', color: '#db2777', steps: [
    { name: 'Application de la couleur', type: 'work', duration: 30, customerVisible: true },
    { name: 'Temps de pose', type: 'pause', duration: 30, customerVisible: true },
    { name: 'Rinçage & coiffage', type: 'work', duration: 20, customerVisible: true },
    { name: 'Nettoyage', type: 'cleanup', duration: 10, customerVisible: false },
  ] },
];
function previewSegments(id: string, start: Date, serviceId: string): AppointmentSegment[] {
  if (serviceId !== 'demo-couleur') return [];
  let cursor = start.getTime();
  return (agendaServices.find(service => service.id === serviceId)?.steps || []).map((step, index) => {
    const startTime = new Date(cursor); cursor += step.duration * 60_000;
    return { id: `${id}-step-${index}`, label: step.name, type: step.type, startTime, endTime: new Date(cursor), occupiesStaff: step.type !== 'pause' };
  });
}

export function seedAppointments(): Appointment[] {
  return ['Élodie Noël', 'Lucas Bernard', 'Emma Dubois', 'Jean Dupont', 'Julie Simon', 'Nicolas Petit', 'Sophie Martin', 'Alex Leroy', 'Camille Laurent', 'Léa Moreau', 'Maxime Denis', 'Louise Perrin', 'Arthur Simon', 'Maya André', 'Paul Robert'].map((clientName, index) => {
    const service = agendaServices[index % agendaServices.length];
    const startTime = addDays(new Date(), index < 9 ? 0 : index < 12 ? 1 : -1);
    startTime.setHours(9 + Math.floor((index % 9) / 3) * 3, index % 3 === 0 ? 30 : 0, 0, 0);
    const paymentStatus = index === 0 ? 'deposit_paid' : index === 1 ? 'paid' : 'unpaid';
    return {
      id: `demo-rdv-${index}`, clientName, clientPhone: `0000 00 00 ${String(index).padStart(2, '0')}`,
      services: [service], startTime, endTime: new Date(startTime.getTime() + service.duration * 60_000),
      status: index >= 12 ? 'completed' : 'scheduled', totalPrice: service.price,
      isPaid: index >= 12, paymentStatus: index >= 12 ? 'paid' : paymentStatus,
      amountPaid: index >= 12 || paymentStatus === 'paid' ? service.price : index === 0 ? 10 : 0,
      depositRequired: index === 0 ? 10 : 0, staffId: previewMembers[index % 3].id,
      notes: 'Rendez-vous fictif pour tester l’agenda.',
      segments: previewSegments(`demo-rdv-${index}`, startTime, service.id),
    };
  });
}

export function seedWaitlist(): BookingWaitlistEntry[] {
  return ['Alice Démo', 'Hugo Démo'].map((client_name, index) => ({
    id: `demo-wait-${index}`, salon_id: 'preview', service_id: agendaServices[index].id,
    preferred_staff_id: previewMembers[index].id, client_name, client_phone: '0000 00 00 00',
    preferred_date_from: format(new Date(), 'yyyy-MM-dd'), preferred_date_to: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    preferred_time_start: '09:00', preferred_time_end: '18:00', status: 'active',
    notification_count: 0, last_notified_at: null, offer_expires_at: null,
    created_at: new Date().toISOString(), service: { name: agendaServices[index].name }, preferred_staff: { name: previewMembers[index].name },
  }));
}

export const previewServices: (Service & WaitlistService & { color: string })[] = [
  ...agendaServices,
  { id: 'demo-barbe-seule', name: 'Barbe', price: 15, duration: 20, category: 'barbe', color: '#d97706' },
  { id: 'demo-enfant', name: 'Coupe enfant', price: 20, duration: 25, category: 'coupe', color: '#0284c7' },
  { id: 'demo-coloration', name: 'Coloration', price: 55, duration: 60, category: 'coupe', color: '#9333ea' },
  { id: 'demo-soin', name: 'Soin', price: 18, duration: 20, category: 'coupe', color: '#0d9488' },
];

// The former POS had no persistence. Keep an explicit mapping for consumers;
// never rewrite the price, duration or steps of a saved appointment snapshot.
export const legacyPreviewServiceIds: Record<string, string> = {
  s1: 'demo-coupe', s2: 'demo-barbe', s3: 'demo-barbe-seule',
  s4: 'demo-enfant', s5: 'demo-coloration', s6: 'demo-soin',
};
