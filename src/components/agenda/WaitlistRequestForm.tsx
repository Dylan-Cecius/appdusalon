import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Staff } from '@/hooks/useStaff';
import type { WaitlistRequest, WaitlistService } from '@/lib/waitlistSlots';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function WaitlistRequestForm({ services, staff, timezone, onSave, onCancel }: {
  services: WaitlistService[]; staff: Staff[]; timezone: string;
  onSave: (entry: WaitlistRequest) => Promise<void>; onCancel: () => void;
}) {
  const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
  const [from, setFrom] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectClass = 'mt-1 h-10 w-full rounded-md border bg-white px-2 text-sm';
  return <form className="space-y-3 rounded-2xl border bg-white p-4" aria-label="Ajouter une demande" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || '').trim();
    const entry: WaitlistRequest = { client_name: value('name'), client_phone: value('phone'), service_id: value('service'), preferred_staff_id: value('staff') || null,
      preferred_date_from: value('from'), preferred_date_to: value('to'), preferred_time_start: value('start') || null, preferred_time_end: value('end') || null };
    if (entry.client_name.length < 2 || !/^\d{6,15}$/.test(entry.client_phone.replace(/\D/g, ''))) { setError('Indiquez un nom et un numéro de téléphone valides.'); return; }
    if (entry.preferred_time_start && entry.preferred_time_end && entry.preferred_time_start >= entry.preferred_time_end) { setError('L’heure de fin doit suivre l’heure de début.'); return; }
    setBusy(true); setError('');
    try { await onSave(entry); } catch (err) { setError(err instanceof Error ? err.message : 'Impossible d’ajouter la demande.'); }
    finally { setBusy(false); }
  }}>
    <h3 className="font-semibold text-sm">Ajouter une demande</h3>
    <div><Label htmlFor="wait-name">Nom du client</Label><Input id="wait-name" name="name" required minLength={2} maxLength={100} autoComplete="off" /></div>
    <div><Label htmlFor="wait-phone">Téléphone</Label><Input id="wait-phone" name="phone" required type="tel" maxLength={30} autoComplete="off" /></div>
    <div><Label htmlFor="wait-service">Prestation souhaitée</Label><select id="wait-service" name="service" required className={selectClass}>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
    <div><Label htmlFor="wait-staff">Collaborateur souhaité</Label><select id="wait-staff" name="staff" className={selectClass}><option value="">Sans préférence</option>{staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
    <div className="grid grid-cols-2 gap-2">
      <div><Label htmlFor="wait-from">À partir du</Label><Input id="wait-from" name="from" type="date" min={today} required value={from} onChange={event => setFrom(event.target.value)} /></div>
      <div><Label htmlFor="wait-to">Jusqu’au</Label><Input id="wait-to" name="to" type="date" required min={from || today} max={from ? format(addDays(new Date(`${from}T12:00:00`), 30), 'yyyy-MM-dd') : undefined} defaultValue={today} /></div>
      <div><Label htmlFor="wait-start">Disponible dès</Label><Input id="wait-start" name="start" type="time" /></div>
      <div><Label htmlFor="wait-end">Jusqu’à</Label><Input id="wait-end" name="end" type="time" /></div>
    </div>
    <p className="text-xs text-slate-500">Période de 31 jours maximum. L’ajout n’envoie aucun message au client.</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Annuler</Button><Button disabled={busy || !services.length}>{busy ? 'Ajout…' : 'Ajouter la demande'}</Button></div>
  </form>;
}
