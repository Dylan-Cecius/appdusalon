import { describe, expect, it, vi } from 'vitest';
import { calculateClientStats, readClientStats, type ClientStatsTransaction } from './clientStats';
const now = new Date('2026-10-15T12:00:00Z');
const tx = (id: string, amount = 18, appointment_id?: string): ClientStatsTransaction => ({ id, total_amount: amount, transaction_date: '2026-10-14T10:00:00Z', appointment_id });
const appointment = (id: string, status = 'completed') => ({ id, start_time: '2026-10-14T09:00:00Z', status });
describe('client recorded passages', () => {
  it('counts a linked sale and completed appointment once, plus unrelated visits', () => {
    expect(calculateClientStats([tx('sale',18,'a'),tx('walk-in',10)], [appointment('a'),appointment('b')], now)).toEqual({totalSpent:28,visitCount:3,lastVisit:'2026-10-14T10:00:00.000Z'});
  });
  it('excludes cancelled, absent, pending and merely scheduled appointments', () => {
    expect(calculateClientStats([],['cancelled','no_show','pending_payment','scheduled'].map(status=>appointment(status,status)),now)).toEqual({totalSpent:0,visitCount:0,lastVisit:null});
  });
  it('does not guess links for legacy sales on the same day', () => { expect(calculateClientStats([tx('legacy')],[appointment('a')],now).visitCount).toBe(2); });
  it('uses the actual appointment date for a linked sale recorded later', () => { expect(calculateClientStats([tx('sale',18,'a')],[appointment('a')],now).lastVisit).toBe('2026-10-14T09:00:00.000Z'); });
  it('uses cents and omits future records', () => {
    const result=calculateClientStats([tx('a',0.1),tx('b',0.2),{...tx('future'),transaction_date:'2026-10-16T10:00:00Z'}],[{...appointment('future'),start_time:'2026-10-16T10:00:00Z'}],now);
    expect(result.totalSpent).toBe(0.3);expect(result.visitCount).toBe(2);
  });
  it('rejects malformed amounts/dates and duplicate identities', () => {
    for(const rows of [[tx('a'),tx('a')],[{...tx('a'),total_amount:'bad'}],[{...tx('a'),transaction_date:'bad'}]]) expect(()=>calculateClientStats(rows,[],now)).toThrow();
  });
  it('reads all pages before returning a total', async () => {
    const transactions=vi.fn().mockResolvedValueOnce({data:[tx('a')],count:2,error:null}).mockResolvedValueOnce({data:[tx('b')],count:2,error:null});
    expect((await readClientStats(transactions,async()=>({data:[],count:0,error:null}),()=>true,now,1))?.totalSpent).toBe(36);
    expect(transactions).toHaveBeenCalledTimes(2);
  });
  it('does not turn an appointments read failure into zero visits', async () => { await expect(readClientStats(async()=>({data:[],count:0,error:null}),async()=>({data:null,count:null,error:new Error('denied')}),()=>true,now)).rejects.toThrow('denied'); });
  it('discards results after a salon change', async () => {
    let active=true;
    expect(await readClientStats(async()=>{active=false;return {data:[tx('a')],count:1,error:null};},async()=>({data:[],count:0,error:null}),()=>active,now)).toBeNull();
  });
});
