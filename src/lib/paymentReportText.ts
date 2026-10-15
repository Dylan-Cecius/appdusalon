import { differenceInCalendarDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { DatedTransaction } from './paymentStats';
import { dailyPaymentReports, paymentReportExplanation, paymentReportFilters, sumPaymentReports, validReportRange, type PaymentFilter } from './paymentReports';
export type PaymentReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
const titles: Record<PaymentReportType,string> = { daily:'journalier',weekly:'hebdomadaire',monthly:'mensuel',custom:'personnalisé' };
export function buildPaymentReportText(input: { transactions: readonly DatedTransaction[]; start: Date; end: Date; type: PaymentReportType; filter: PaymentFilter; message?: string; generatedAt?: Date }) {
  if (!validReportRange(input.start,input.end)) throw new Error('Choisissez des dates valides, avec la fin après le début.');
  if (differenceInCalendarDays(input.end,input.start) >= 366) throw new Error('Limitez ce rapport à 366 jours pour conserver un document lisible et compatible avec l’envoi.');
  const days=dailyPaymentReports(input.transactions,input.start,input.end,input.filter);
  const totals=sumPaymentReports(days);
  const range=`${format(input.start,'dd/MM/yyyy')} au ${format(input.end,'dd/MM/yyyy')}`;
  const label=paymentReportFilters.find(option=>option.key===input.filter)!.label;
  const columns=paymentReportFilters.filter(option=>option.key!=='all'&&(input.filter==='all'||option.key===input.filter));
  const money=(amount:number)=>`${amount.toFixed(2)} €`;
  const summary=columns.map(column=>`${column.label} : ${money(totals[`${column.key as Exclude<PaymentFilter,'all'>}Amount`])}`).join('\n');
  const rows=days.map(day=>[
    format(day.date,'dd/MM/yyyy'),String(day.transactions),
    ...columns.map(column=>day[`${column.key as Exclude<PaymentFilter,'all'>}Amount`].toFixed(2)),day.totalAmount.toFixed(2),
  ].join(' | '));
  const content=[
    `RAPPORT ${titles[input.type].toUpperCase()} — ${range}`,
    `Filtre : ${label}`,
    paymentReportExplanation,
    '',
    `${input.filter==='all'?'Montant des ventes':'Part du paiement sélectionné'} : ${money(totals.totalAmount)}`,
    `Ventes concernées : ${totals.transactions}`,
    summary,
    ...(totals.unallocatedAmount>0?['Des détails de paiement sont absents ou incohérents ; ces montants restent inclus dans le total.']:[]),
    '',
    ['Date','Ventes',...columns.map(column=>column.label),'Total (€)'].join(' | '),
    ...rows,
    '',
    ...(input.message?.trim()?['Notes :',input.message.trim(),'']:[]),
    `Généré le ${formatInTimeZone(input.generatedAt||new Date(),'Europe/Brussels','dd/MM/yyyy à HH:mm')} (Europe/Brussels).`,
  ].join('\n');
  if(content.length>50_000) throw new Error('Le rapport dépasse la taille autorisée. Réduisez la période ou les notes.');
  return { subject:`Rapport ${titles[input.type]} — ${range}`,content,totals };
}
