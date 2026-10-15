import { describe, expect, it } from 'vitest';
import { dailyPaymentReports, paymentAmountFor, paymentReport, sumPaymentReports, validReportRange } from './paymentReports';
import { normalizeTransaction } from './transactions';
const mixed=normalizeTransaction({id:'mixed',items:[],total_amount:40,payment_method:'mixed',transaction_date:'2026-10-14T22:30:00Z',transaction_payments:[{id:'a',amount:10,method:'stripe_booking',paid_at:'2026-09-01T10:00:00Z'},{id:'b',amount:30,method:'cash',paid_at:'2026-10-14T22:30:00Z'}]});
const prepaid={...mixed,id:'prepaid',paymentMethod:'prepaid' as const,payments:undefined};
const unknown={...mixed,id:'unknown',payments:undefined};
describe('report payment filters',()=>{
  it('keeps prepaid and unspecified funding in the all-method total',()=>{
    expect(paymentReport([mixed,prepaid,unknown])).toEqual({transactions:3,cashAmount:30,cardAmount:0,prepaidAmount:50,unallocatedAmount:40,totalAmount:120});
  });
  it('takes only the cash portion of a mixed sale and preserves the original transaction',()=>{
    expect(paymentReport([mixed,prepaid,unknown],'cash')).toMatchObject({transactions:1,totalAmount:30,prepaidAmount:0});
    expect(paymentAmountFor(mixed,'cash')).toBe(30);expect(mixed.totalAmount).toBe(40);
  });
  it('counts one sale across multiple lines of the selected method',()=>{
    const split={...mixed,payments:[{id:'one',amount:10,method:'card',paidAt:''},{id:'two',amount:30,method:'card',paidAt:''}]};
    expect(paymentReport([split],'card')).toMatchObject({transactions:1,totalAmount:40});
  });
  it('exposes prepaid and missing-detail filters without guessing card totals',()=>{
    expect(paymentReport([mixed,prepaid,unknown],'prepaid')).toMatchObject({transactions:2,totalAmount:50});
    expect(paymentReport([mixed,prepaid,unknown],'unallocated')).toMatchObject({transactions:1,totalAmount:40});
    expect(paymentReport([mixed,prepaid,unknown],'card')).toMatchObject({transactions:0,totalAmount:0});
  });
  it('groups by sale day in Brussels, not the original deposit day',()=>{
    const days=dailyPaymentReports([mixed],new Date(2026,9,14),new Date(2026,9,15));
    expect(days.map(day=>day.totalAmount)).toEqual([0,40]);
    expect(sumPaymentReports(days)).toMatchObject({transactions:1,cashAmount:30,prepaidAmount:10,totalAmount:40});
  });
  it('rejects invalid or reversed date ranges without crashing the form',()=>{
    expect(validReportRange(new Date('invalid'),new Date())).toBe(false);
    expect(dailyPaymentReports([mixed],new Date(2026,9,16),new Date(2026,9,15))).toEqual([]);
  });
  it('sums day amounts in cents and keeps empty ranges explicit',()=>{
    const report=paymentReport([{totalAmount:0.1,paymentMethod:'cash'}]);
    expect(sumPaymentReports([report,report,report]).totalAmount).toBe(0.3);
    expect(sumPaymentReports([]).transactions).toBe(0);
  });
});
