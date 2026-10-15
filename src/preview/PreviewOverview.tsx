import { useState, type ReactNode } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { matchesClientSearch } from '@/lib/searchText';
import { previewMembers } from './data';
import { usePreview } from './PreviewProvider';
import { previewClients, previewMetrics, previewTimezone } from './projections';

const money = (cents: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const dateLabel = (date: Date, pattern: string) => formatInTimeZone(date, previewTimezone, pattern, { locale: fr });
const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Panel><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Panel>;
}
function RevenueChart({ daily }: { daily: { day: string; totalCents: number }[] }) {
  const max = Math.max(1, ...daily.map(item => item.totalCents));
  return <div className="mt-5 grid h-56 grid-cols-7 items-end gap-2" aria-label="Chiffre d’affaires fictif des sept derniers jours">
    {daily.map(item => <div key={item.day} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
      <span className="text-[10px] font-medium sm:text-xs">{money(item.totalCents)}</span>
      <div aria-hidden="true" className="w-full rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(item.totalCents ? 2 : 0, item.totalCents / max * 75)}%` }} />
      <span className="text-xs text-slate-500">{item.day.slice(8)}/{item.day.slice(5, 7)}</span>
    </div>)}
  </div>;
}
export function PreviewDashboard({ openAgenda }: { openAgenda: () => void }) {
  const { state, now } = usePreview();
  const today = previewMetrics(state, now, 1), week = previewMetrics(state, now, 7);
  const clients = previewClients(state);
  return <div className="space-y-6">
    <div><p className="text-sm capitalize text-slate-500">{dateLabel(now, 'EEEE d MMMM yyyy')}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Bonjour Dylan</h1><p className="mt-1 text-slate-500">Votre journée fictive, actualisée avec vos essais dans l’agenda et la caisse.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="CA simulé aujourd’hui" value={money(today.totalCents)} detail={`${today.sales.length} passage(s) confirmé(s)`} />
      <Metric label="Rendez-vous aujourd’hui" value={String(today.appointments.length)} detail="Hors annulations et absences" />
      <Metric label="Contacts fictifs" value={String(clients.length)} detail="Issus de l’agenda et des tickets nominatifs" />
      <Metric label="Panier moyen" value={money(today.averageCents)} detail="Passages confirmés du jour" />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel><h2 className="font-semibold">Chiffre d’affaires simulé</h2><p className="text-sm text-slate-500">7 derniers jours · dates du salon</p><RevenueChart daily={week.daily} /></Panel>
      <Panel><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Prochains rendez-vous</h2><button type="button" onClick={openAgenda} className="text-sm font-medium text-indigo-700 underline">Voir l’agenda</button></div>
        <div className="mt-4 space-y-3">{today.upcoming.slice(0, 5).map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-indigo-700">{dateLabel(item.startTime, 'EEE d MMM · HH:mm')}</p><p className="mt-1 truncate text-sm font-medium">{item.clientName}</p><p className="truncate text-xs text-slate-500">{item.services.map(service => service.name).join(', ')} · {previewMembers.find(member => member.id === item.staffId)?.name || 'Collaborateur'}</p></div>)}{!today.upcoming.length && <p className="text-sm text-slate-500">Aucun rendez-vous à venir dans cette démonstration.</p>}</div>
      </Panel>
    </div>
    <Panel><h2 className="font-semibold">Derniers passages confirmés</h2><SaleList sales={week.sales.slice(0, 5)} /></Panel>
  </div>;
}

function SaleList({ sales }: { sales: ReturnType<typeof previewMetrics>['sales'] }) {
  return <div className="mt-4 space-y-3">{sales.length ? sales.map(sale => <div key={sale.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{sale.clientName || 'Sans client associé'}</p><p className="text-xs text-slate-500">{dateLabel(sale.date, 'dd/MM · HH:mm')} · {sale.source === 'agenda' ? 'Rendez-vous terminé' : 'Ticket caisse'}</p><p className="truncate text-xs text-slate-500">{sale.lines.map(line => line.name).join(', ')}</p></div><span className="whitespace-nowrap font-semibold">{money(sale.totalCents)}</span></div>) : <p className="text-sm text-slate-500">Aucun passage confirmé sur cette période.</p>}</div>;
}

export function PreviewStats() {
  const { state, now } = usePreview();
  const metrics = previewMetrics(state, now, 30);
  const payments = [
    { label: 'Carte', amount: metrics.payments.cardAmount, percent: metrics.payments.cardPercent, color: 'bg-indigo-500' },
    { label: 'Espèces', amount: metrics.payments.cashAmount, percent: metrics.payments.cashPercent, color: 'bg-emerald-500' },
    { label: 'Non renseigné (agenda)', amount: metrics.payments.unallocatedAmount, percent: metrics.payments.unallocatedPercent, color: 'bg-slate-400' },
  ];
  const highestCount = Math.max(1, ...metrics.services.map(service => service.count));
  return <div className="space-y-5"><div><h1 className="text-3xl font-semibold">Statistiques</h1><p className="mt-1 text-slate-500">30 derniers jours, aujourd’hui inclus · données fictives uniquement.</p></div>
    <div className="grid gap-4 md:grid-cols-3"><Metric label="CA simulé" value={money(metrics.totalCents)} detail="Rendez-vous terminés et tickets confirmés" /><Metric label="Passages confirmés" value={String(metrics.sales.length)} detail="Un rendez-vous ou un ticket = un passage" /><Metric label="Panier moyen" value={money(metrics.averageCents)} detail="Montant moyen des passages confirmés" /></div>
    <p className="text-xs text-slate-500">Les rendez-vous sont comptés à leur date réservée et les tickets à leur date de confirmation, dans le fuseau du salon. Les acomptes ne sont pas ajoutés une seconde fois. Ce n’est pas un relevé de trésorerie.</p>
    <div className="grid gap-5 lg:grid-cols-2"><Panel><h2 className="font-semibold">Prestations réalisées</h2><div className="mt-4 space-y-4">{metrics.services.slice(0, 8).map(service => <div key={service.id}><div className="mb-1 flex justify-between gap-2 text-sm"><span>{service.name}</span><span>{service.count}</span></div><div aria-hidden="true" className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${service.count / highestCount * 100}%` }} /></div></div>)}{!metrics.services.length && <p className="text-sm text-slate-500">Aucune prestation confirmée.</p>}</div></Panel>
      <Panel><h2 className="font-semibold">Répartition des règlements simulés</h2><div className="mt-5 space-y-4">{payments.map(item => <div key={item.label}><div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span>{item.label}</span><span>{money(Math.round(item.amount * 100))} · {Math.round(item.percent)} %</span></div><div aria-hidden="true" className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} /></div></div>)}</div><p className="mt-4 text-xs text-slate-500">Le moyen de règlement des rendez-vous n’est pas enregistré dans l’agenda de démonstration.</p></Panel>
    </div><Panel><h2 className="font-semibold">Derniers passages sur la période</h2><SaleList sales={metrics.sales.slice(0, 10)} /></Panel>
  </div>;
}

export function PreviewClients() {
  const { state } = usePreview(); const [query, setQuery] = useState('');
  const clients = previewClients(state), filtered = clients.filter(client => matchesClientSearch(client, query));
  return <div><h1 className="text-3xl font-semibold">Clients</h1><p className="mt-1 text-slate-500">{clients.length} contacts fictifs · alimentés par l’agenda et les tickets nominatifs.</p>
    <p className="mt-2 text-xs text-slate-500">Utilisez le même nom et téléphone fictifs dans les deux écrans pour retrouver les passages ensemble. Un ticket sans nom reste anonyme.</p>
    <label className="relative mt-5 block max-w-md"><span className="sr-only">Rechercher un client</span><Search aria-hidden="true" className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom ou téléphone fictif…" className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-200" /></label>
    <div className="mt-4 overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="w-full min-w-[480px] text-left text-sm"><caption className="sr-only">Contacts et passages fictifs enregistrés</caption><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Client</th><th className="p-3">Téléphone</th><th className="p-3">Passages</th><th className="p-3">CA simulé</th></tr></thead><tbody>{filtered.map(client => <tr key={client.id} className="border-t"><th scope="row" className="p-4 font-medium">{client.name}</th><td className="p-4 text-slate-500">{client.phone || 'Non renseigné'}</td><td className="p-4">{client.visits}</td><td className="p-4 font-medium">{money(client.totalCents)}</td></tr>)}</tbody></table>{!filtered.length && <p role="status" className="p-5 text-sm text-slate-500">Aucun contact ne correspond à la recherche.</p>}</div>
  </div>;
}
