import { describe, expect, it } from 'vitest';
import { buildPaymentReportText } from './paymentReportText';
import type { DatedTransaction } from './paymentStats';
const tx:DatedTransaction={totalAmount:40,paymentMethod:'mixed',transactionDate:new Date(2026,9,15,12),transactionInstant:'2026-10-15T10:00:00Z',payments:[{id:'a',amount:10,method:'stripe_booking',paidAt:'2026-09-01T10:00:00Z'},{id:'b',amount:30,method:'cash',paidAt:'2026-10-15T10:00:00Z'}]};
const input={transactions:[tx],start:new Date(2026,9,15),end:new Date(2026,9,15),type:'daily' as const,filter:'all' as const,generatedAt:new Date('2026-10-15T10:00:00Z')};
describe('local report text generation',()=>{
  it('reconciles preview text and source totals including the deposit',()=>{
    const result=buildPaymentReportText(input);
    expect(result.content).toContain('Montant des ventes : 40.00 €');
    expect(result.content).toContain('Acomptes / prépaiements : 10.00 €');
    expect(result.content).toContain('Espèces : 30.00 €');
    expect(result.content).toContain('peuvent avoir été reçus avant cette période');
    expect(result.content).toContain('15/10/2026 à 12:00');
    expect(result.totals.totalAmount).toBe(40);
  });
  it('uses a partial-payment label when filtering cash',()=>{
    const result=buildPaymentReportText({...input,filter:'cash'});
    expect(result.content).toContain('Part du paiement sélectionné : 30.00 €');
    expect(result.totals.transactions).toBe(1);
  });
  it('keeps an old mixed sale as unallocated in the report total',()=>{
    const result=buildPaymentReportText({...input,transactions:[{...tx,payments:undefined}]});
    expect(result.content).toContain('Non renseigné : 40.00 €');
    expect(result.content).toContain('absents ou incohérents');
  });
  it('reports an empty period without NaN',()=>{
    const result=buildPaymentReportText({...input,transactions:[]});
    expect(result.content).toContain('Ventes concernées : 0');expect(result.content).not.toContain('NaN');
  });
  it.each([new Date('invalid'),new Date(2026,9,14)])('refuses an invalid end date before generation',end=>expect(()=>buildPaymentReportText({...input,end})).toThrow('Choisissez des dates valides'));
  it('rejects unbounded date ranges and oversized notes before any sender is involved',()=>{
    expect(()=>buildPaymentReportText({...input,end:new Date(2030,9,15)})).toThrow('366 jours');
    expect(()=>buildPaymentReportText({...input,message:'x'.repeat(50_001)})).toThrow('taille autorisée');
  });
});
