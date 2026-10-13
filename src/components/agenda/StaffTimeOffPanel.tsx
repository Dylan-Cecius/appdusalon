import { useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Staff } from '@/hooks/useStaff';
import { timeOffReasons, type StaffTimeOff, type TimeOffInput } from '@/lib/staffTimeOff';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function TimeOffForm({ entry, date, staff, staffId, onSave, onCancel }: {
  entry?: StaffTimeOff; date: Date; staff: Staff[]; staffId: string;
  onSave: (input: TimeOffInput, id?: string) => Promise<void>; onCancel: () => void;
}) {
  const wholeDay = !!entry && format(entry.startTime, 'HH:mm') === '00:00' && format(entry.endTime, 'HH:mm') === '00:00';
  const [allDay, setAllDay] = useState(wholeDay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectClass = 'h-10 w-full rounded-md border bg-white px-2 text-sm';
  return <form aria-label="Indisponibilité" className="space-y-3 rounded-xl border bg-white p-4" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget), value = (key: string) => String(data.get(key) || '');
    const startTime = new Date(`${value('from')}T${allDay ? '00:00' : value('start')}:00`);
    const endTime = allDay ? addDays(new Date(`${value('to')}T00:00:00`), 1) : new Date(`${value('to')}T${value('end')}:00`);
    if (!(endTime > startTime)) { setError('La fin doit suivre le début de l’indisponibilité.'); return; }
    setBusy(true); setError('');
    try { await onSave({ staffId: value('staff'), title: value('title').trim(), reason: value('reason') as StaffTimeOff['reason'], startTime, endTime }, entry?.id); onCancel(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible.'); } finally { setBusy(false); }
  }}>
    <h3 className="text-sm font-semibold">{entry ? 'Modifier l’indisponibilité' : 'Bloquer un créneau'}</h3>
    <div><Label htmlFor="off-staff">Collaborateur</Label><select id="off-staff" name="staff" required className={selectClass} defaultValue={entry?.staffId || staffId || staff[0]?.id}>{staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
    <div><Label htmlFor="off-reason">Motif</Label><select id="off-reason" name="reason" className={selectClass} defaultValue={entry?.reason || 'unavailable'}>{Object.entries(timeOffReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    <div><Label htmlFor="off-title">Libellé</Label><Input id="off-title" name="title" required maxLength={100} defaultValue={entry?.title || ''} placeholder="Ex. Formation, congé…" /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={event => setAllDay(event.target.checked)} />Journée entière</label>
    <div className="grid grid-cols-2 gap-2">
      <div><Label htmlFor="off-from">Du</Label><Input id="off-from" name="from" type="date" required defaultValue={format(entry?.startTime || date, 'yyyy-MM-dd')} /></div>
      <div><Label htmlFor="off-to">Au inclus</Label><Input id="off-to" name="to" type="date" required defaultValue={format(entry ? wholeDay ? subDays(entry.endTime, 1) : entry.endTime : date, 'yyyy-MM-dd')} /></div>
      {!allDay && <><div><Label htmlFor="off-start">Début</Label><Input id="off-start" name="start" type="time" required defaultValue={entry ? format(entry.startTime, 'HH:mm') : '16:00'} /></div><div><Label htmlFor="off-end">Fin</Label><Input id="off-end" name="end" type="time" required defaultValue={entry ? format(entry.endTime, 'HH:mm') : '17:00'} /></div></>}
    </div>
    <p className="text-xs text-slate-500">Les rendez-vous existants doivent être déplacés ou annulés avant de bloquer leur créneau. Horaires de cet appareil.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Annuler</Button><Button disabled={busy || !staff.length}>{busy ? 'Enregistrement…' : 'Enregistrer l’indisponibilité'}</Button></div>
  </form>;
}

export default function StaffTimeOffPanel({ open, onOpenChange, entries, staff, date, staffId, onSave, onRemove, loading, error }: {
  open: boolean; onOpenChange: (open: boolean) => void; entries: StaffTimeOff[]; staff: Staff[]; date: Date; staffId: string;
  onSave?: (input: TimeOffInput, id?: string) => Promise<void>; onRemove?: (id: string) => Promise<void>; loading?: boolean; error?: boolean;
}) {
  const [editing, setEditing] = useState<StaffTimeOff | 'new' | null>(null);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const visible = entries.filter(item => item.endTime > new Date(format(date, 'yyyy-MM-dd') + 'T00:00:00')).sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[94vw] overflow-y-auto sm:max-w-lg">
    <SheetHeader><SheetTitle>Indisponibilités</SheetTitle><SheetDescription>Pauses, congés et formations de l’équipe. Ces périodes ne comptent pas comme des rendez-vous.</SheetDescription></SheetHeader>
    <div className="mt-4 space-y-3">
      {onSave && <Button className="w-full" disabled={loading || error || !!busyId} onClick={() => setEditing('new')}>Bloquer un créneau</Button>}
      {editing && onSave && <TimeOffForm key={editing === 'new' ? 'new' : editing.id} entry={editing === 'new' ? undefined : editing} date={date} staff={staff} staffId={staffId} onSave={onSave} onCancel={() => setEditing(null)} />}
      {(error || actionError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError || 'Les indisponibilités ne sont pas disponibles sur cet environnement. Vérifiez la connexion et la mise à jour du serveur.'}</p>}
      {loading ? <p>Chargement…</p> : <><p className="text-xs text-slate-500">À partir du {format(date, 'd MMMM yyyy', { locale: fr })}</p>{visible.map(item => <article key={item.id} aria-label={`Indisponibilité ${item.title}`} className="rounded-xl border border-slate-300 bg-slate-100 p-3">
        <p className="font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-600">{timeOffReasons[item.reason]} · {staff.find(member => member.id === item.staffId)?.name || 'Collaborateur'}</p>
        <p className="my-2 text-sm">{format(item.startTime, 'dd/MM HH:mm')} → {format(item.endTime, 'dd/MM HH:mm')}</p>
        {onSave && onRemove && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!!busyId} onClick={() => setEditing(item)}>Modifier</Button><Button size="sm" variant="outline" disabled={!!busyId} onClick={async () => { setBusyId(item.id); setActionError(''); try { await onRemove(item.id); if (editing !== 'new' && editing?.id === item.id) setEditing(null); } catch (err) { setActionError(err instanceof Error ? err.message : 'Suppression impossible.'); } finally { setBusyId(''); } }}>Libérer le créneau</Button></div>}
      </article>)}{!visible.length && !error && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Aucune indisponibilité sur cette période.</p>}</>}
    </div>
  </SheetContent></Sheet>;
}
