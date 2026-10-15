import { describe, expect, it } from 'vitest';
import { automatedReportFields, type CreateAutomatedReportData } from './automatedReportConfig';
const input: CreateAutomatedReportData = { report_name:' Bilan ',frequency:'weekly',recipient_emails:[' a@example.test ','a@example.test'],report_types:['revenue','revenue','clients'],time_of_day:'09:30',day_of_week:7,day_of_month:14 };
describe('automated report configuration',()=>{
  it('normalizes and whitelists without copying server/owner fields',()=>{expect(automatedReportFields({...input,user_id:'other',is_active:true,next_send_at:'fake'} as CreateAutomatedReportData)).toEqual({report_name:'Bilan',frequency:'weekly',recipient_emails:['a@example.test'],report_types:['revenue','clients'],time_of_day:'09:30:00',day_of_week:7,day_of_month:null});});
  it('clears obsolete days when switching to daily',()=>{expect(automatedReportFields({...input,frequency:'daily'})).toMatchObject({day_of_week:null,day_of_month:null});});
  it('retains seconds and monthly days through 28',()=>{expect(automatedReportFields({...input,frequency:'monthly',time_of_day:'23:59:30',day_of_month:28})).toMatchObject({time_of_day:'23:59:30',day_of_week:null,day_of_month:28});});
  it.each([{report_name:' '},{report_name:'a\nb'},{recipient_emails:[]},{recipient_emails:['bad']},{recipient_emails:['a@@example.test']},{report_types:[]},{report_types:['unknown']},{time_of_day:'24:00'},{time_of_day:'09:00:60'},{frequency:'bad'},{day_of_week:0},{day_of_week:8},{day_of_week:1.5},{frequency:'monthly',day_of_month:29},{frequency:'monthly',day_of_month:null}])('rejects malformed configuration %j',patch=>{expect(()=>automatedReportFields({...input,...patch} as CreateAutomatedReportData)).toThrow();});
});
