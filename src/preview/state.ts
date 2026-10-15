import { format } from 'date-fns';
import { z } from 'zod';
import type { Appointment } from '@/data/appointments';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import type { StaffTimeOff } from '@/lib/staffTimeOff';
import type { Service } from '@/data/services';
import { seedAppointments, seedWaitlist } from './data';

export type PreviewCart = { id: string; lines: Service[]; clientName: string; clientPhone: string };
export type PreviewTicket = {
  id: string; createdAt: Date; lines: Service[]; totalCents: number;
  method: 'cash' | 'card'; clientName: string; clientPhone: string;
};
export type PreviewState = {
  version: 1; appointments: Appointment[]; waitlist: BookingWaitlistEntry[];
  timeOff: StaffTimeOff[]; cart: PreviewCart; tickets: PreviewTicket[];
};

// Keep the existing local-calendar day key. It is fixed for one open session;
// reloading on a later day starts that day's demonstration, as before.
export const previewStorageKey = (date: Date) => `appdusalon-agenda-preview-v2-${format(date, 'yyyy-MM-dd')}`;
export const emptyPreviewCart = (id: string): PreviewCart => ({ id, lines: [], clientName: '', clientPhone: '' });
export const seedPreviewState = (): PreviewState => ({
  version: 1, appointments: seedAppointments(), waitlist: seedWaitlist(), timeOff: [],
  cart: emptyPreviewCart(crypto.randomUUID()), tickets: [],
});

const id = z.string().min(1);
const number = z.number().finite().nonnegative();
const date = z.union([z.date(), z.string().datetime({ offset: true })]).transform(value => new Date(value));
const price = number.refine(value => Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001);
const service = z.object({ id, name: z.string(), price, duration: number,
  category: z.enum(['coupe', 'barbe', 'combo', 'produit']), appointmentBuffer: number.optional(),
}).passthrough();
const segment = z.object({ id, label: z.string(), type: z.enum(['work', 'pause', 'cleanup', 'block']),
  startTime: date, endTime: date, occupiesStaff: z.boolean(),
}).passthrough().refine(item => item.endTime > item.startTime);
const appointment = z.object({
  id, clientName: z.string(), clientPhone: z.string(), services: z.array(service),
  startTime: date, endTime: date, status: z.enum(['pending_payment', 'scheduled', 'completed', 'cancelled', 'no_show']),
  totalPrice: number, isPaid: z.boolean(),
  paymentStatus: z.enum(['unpaid', 'pending', 'deposit_paid', 'paid', 'refunded', 'expired']).optional(),
  amountPaid: number.optional(), depositRequired: number.optional(), paymentExpiresAt: date.optional(),
  staffId: z.string().optional(), barberId: z.string().optional(), notes: z.string().optional(),
  segments: z.array(segment).optional(), updatedAt: z.string().optional(),
}).passthrough().refine(item => item.endTime > item.startTime);
const waitlist = z.object({
  id, salon_id: id, service_id: id, preferred_staff_id: z.string().nullable(),
  client_name: z.string(), client_phone: z.string(), preferred_date_from: z.string(), preferred_date_to: z.string(),
  preferred_time_start: z.string().nullable(), preferred_time_end: z.string().nullable(),
  status: z.enum(['active', 'notified', 'booked', 'cancelled', 'expired']), notification_count: number,
  last_notified_at: z.string().nullable(), offer_expires_at: z.string().nullable(), created_at: z.string(),
}).passthrough();
const timeOff = z.object({ id, staffId: id, title: z.string(), reason: z.enum(['unavailable', 'break', 'leave', 'training']),
  startTime: date, endTime: date,
}).passthrough().refine(item => item.endTime > item.startTime);
const cart = z.object({ id, lines: z.array(service).max(100), clientName: z.string(), clientPhone: z.string() }).passthrough();
const ticket = z.object({ id, createdAt: date, lines: z.array(service).min(1).max(100), totalCents: number.int().safe(),
  method: z.enum(['cash', 'card']), clientName: z.string(), clientPhone: z.string(),
}).passthrough().refine(item => item.totalCents === item.lines.reduce((sum, line) => sum + Math.round(line.price * 100), 0));
const uniqueIds = (items: { id?: string }[]) => new Set(items.map(item => item.id)).size === items.length;
const schema = z.object({ version: z.literal(1), appointments: z.array(appointment).refine(uniqueIds),
  waitlist: z.array(waitlist).refine(uniqueIds), timeOff: z.array(timeOff).refine(uniqueIds),
  cart, tickets: z.array(ticket).refine(uniqueIds),
}).passthrough();

export function decodePreviewState(raw: string | null, seed: PreviewState): PreviewState {
  if (raw === null) return seed;
  const input: unknown = JSON.parse(raw);
  const legacy = Array.isArray(input) ? { appointments: input } : input;
  if (!legacy || typeof legacy !== 'object' || !('appointments' in legacy)) throw new Error('Stockage de démonstration invalide.');
  // Only legacy shapes are supplemented. An unknown or incomplete versioned
  // envelope is never silently downgraded or overwritten.
  const versioned = 'version' in legacy ? legacy : {
    ...legacy, version: 1,
    waitlist: 'waitlist' in legacy ? legacy.waitlist : seed.waitlist,
    timeOff: 'timeOff' in legacy ? legacy.timeOff : [],
    cart: seed.cart, tickets: [],
  };
  return schema.parse(versioned) as PreviewState;
}

export type PreviewStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function createPreviewSession(storage: PreviewStorage, key: string, seed: PreviewState) {
  let raw: string | null = null;
  let state = seed;
  let persistent = true;
  let warning: string | null = null;
  try { raw = storage.getItem(key); state = decodePreviewState(raw, seed); }
  catch {
    persistent = false;
    warning = 'Stockage indisponible ou illisible : vos essais restent dans cet onglet. Les anciennes données ne seront pas écrasées.';
  }
  return {
    getState: () => state,
    getWarning: () => warning,
    commit(next: PreviewState) {
      // Validate before any write or visible success, even in memory-only mode.
      const serialized = JSON.stringify(next);
      decodePreviewState(serialized, seed);
      if (persistent) {
        let latest: string | null;
        try { latest = storage.getItem(key); }
        catch { throw new Error('Impossible de vérifier le stockage. Votre saisie est conservée.'); }
        if (latest !== raw) throw new Error('La démo a changé dans un autre onglet. Rechargez la page avant de continuer.');
        try { storage.setItem(key, serialized); }
        catch { throw new Error('Enregistrement local impossible. Votre saisie est conservée ; libérez de l’espace ou réessayez.'); }
        raw = serialized;
      }
      state = next;
      return state;
    },
  };
}
