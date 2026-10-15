import { describe, expect, it } from 'vitest';
import { normalizeTransaction, paymentMethodLabel } from './transactions';
import { buildPaymentStats, transactionSalonDay } from './paymentStats';
const row = { id:'t',total_amount:'40.00',payment_method:'mixed',transaction_date:'2026-10-14T22:30:00Z',items:[],client_id:'client',staff_id:'staff',transaction_payments:[{id:'p1',amount:'10.00',method:'stripe_booking',paid_at:'2026-09-01T10:00:00Z'},{id:'p2',amount:'30.00',method:'cash',paid_at:'2026-10-14T22:30:00Z'}] };
describe('transaction normalization', () => {
  it('retains funding, original dates and ownership links from the read response', () => {
    const tx=normalizeTransaction(row);
    expect(tx).toMatchObject({id:'t',paymentMethod:'mixed',totalAmount:40,clientId:'client',staffId:'staff',transactionInstant:new Date(row.transaction_date).toISOString()});
    expect(tx.payments?.[0].paidAt).toBe('2026-09-01T10:00:00Z');
    expect(transactionSalonDay(tx)).toBe('2026-10-15');
    expect(buildPaymentStats([tx])).toMatchObject({cashAmount:30,prepaidAmount:10,totalAmount:40});
  });
  it('keeps unknown and missing allocation methods explicit', () => {
    expect(normalizeTransaction({...row,payment_method:'voucher',transaction_payments:undefined}).paymentMethod).toBe('unknown');
    expect(buildPaymentStats([normalizeTransaction({...row,transaction_payments:[]})]).unallocatedAmount).toBe(40);
    expect(paymentMethodLabel.mixed).toBe('Paiement mixte'); expect(paymentMethodLabel.prepaid).toBe('Prépayé');
  });
  it.each([{...row,total_amount:null},{...row,transaction_date:'invalid'},{...row,items:null},{...row,id:''}])('rejects invalid transaction records', value => expect(()=>normalizeTransaction(value)).toThrow('invalid_transaction_record'));
});
