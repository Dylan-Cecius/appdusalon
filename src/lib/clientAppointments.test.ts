import { describe, expect, it } from 'vitest';
import { normalizeClientAppointment } from './clientAppointments';
const row = { id:'a',client_name:'Alex',client_phone:'04',start_time:'2026-10-25T00:30:00Z',end_time:'2026-10-25T01:30:00Z',services:[{name:'Coupe',price:18}],status:'completed',total_price:'18.00',is_paid:true };
describe('client history projection',()=>{
  it('preserves absolute times across the DST change and parses the amount',()=>{const result=normalizeClientAppointment(row);expect(result.startTime.toISOString()).toBe(row.start_time.replace('Z','.000Z'));expect(result.endTime.getTime()-result.startTime.getTime()).toBe(3600000);expect(result.totalPrice).toBe(18);expect(result.services).toEqual([{name:'Coupe'}]);});
  it.each(['cancelled','no_show','pending_payment','scheduled'])('keeps %s visible in history',status=>{expect(normalizeClientAppointment({...row,status}).status).toBe(status);});
  it.each([{start_time:'bad'},{end_time:row.start_time},{services:null},{services:[{name:null}]},{total_price:null},{status:'unknown'}])('rejects malformed history rather than crashing a card',patch=>{expect(()=>normalizeClientAppointment({...row,...patch})).toThrow();});
});
