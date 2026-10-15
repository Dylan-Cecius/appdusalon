import { describe, expect, it, vi } from 'vitest';
import { buildClientExport, clientCsvText, prepareClientExport } from './clientExport';
const client = { id:'a',user_id:'owner',name:'Alex "Le Grand", junior',phone:'+32 471 00 00 00',email:'alex@example.test',birth_date:'2000-02-29',notes:'Ligne 1\nLigne "2"',created_at:'2026-10-14T22:30:00Z',updated_at:'2026-10-15T00:00:00Z' };
const stats = { totalSpent:18.5,visitCount:2,lastVisit:null };
describe('client export serialization',()=>{
  it('quotes commas, embedded quotes and multiline notes with salon-local dates',()=>{
    const csv=buildClientExport([{...client,...stats}],'csv',true);
    expect(csv).toContain('"Alex ""Le Grand"", junior"');expect(csv).toContain('"Ligne 1\nLigne ""2"""');expect(csv).toContain('"29/02/2000","15/10/2026",2,18.50');
  });
  it.each(['=1+1',' +SUM(A1:A2)','-1+2','@SUM(A1)','\t=2','\rtext'])('neutralizes the spreadsheet prefix in %j',value=>{expect(clientCsvText(value).startsWith('"\'')).toBe(true);});
  it('keeps raw JSON strings and excludes notes when not permitted',()=>{
    const json=JSON.parse(buildClientExport([{...client,...stats,name:'=1+1'}],'json',false));
    expect(json[0].date_naissance).toBe('2000-02-29');expect(json[0].nombre_visites).toBe(2);expect(json[0].nom).toBe('=1+1');expect(json[0].telephone).toBe(client.phone);expect(json[0]).not.toHaveProperty('notes');
    expect(buildClientExport([{...client,...stats}],'csv',false)).not.toContain('Notes');
  });
  it('rejects invalid birthdays instead of producing a misleading export',()=>{expect(()=>buildClientExport([{...client,...stats,birth_date:'2026-02-30'}],'csv',true)).toThrow();});
});
describe('bounded export preparation',()=>{
  it('bounds concurrency and preserves order despite reordered replies',async()=>{
    let active=0,max=0;
    const resolvers: (()=>void)[]=[];
    const read=vi.fn(async()=>{active++;max=Math.max(max,active);await new Promise<void>(resolve=>resolvers.push(resolve));active--;return stats;});
    const pending=prepareClientExport(['a','b','c'].map(id=>({...client,id})),read,()=>true,2);
    expect(read).toHaveBeenCalledTimes(2);
    resolvers[1]();await new Promise(resolve=>setTimeout(resolve,0));expect(read).toHaveBeenCalledTimes(3);
    resolvers[2]();resolvers[0]();
    expect((await pending).map(row=>row.id)).toEqual(['a','b','c']);expect(max).toBe(2);
  });
  it('stops scheduling after a read failure and returns no partial export',async()=>{
    const read=vi.fn().mockRejectedValue(new Error('denied'));
    await expect(prepareClientExport([client,{...client,id:'b'}],read,()=>true,1)).rejects.toThrow('denied');expect(read).toHaveBeenCalledTimes(1);
  });
  it('discards a result after the salon changes',async()=>{
    let current=true;
    const read=vi.fn(async()=>{current=false;return stats;});
    await expect(prepareClientExport([client,{...client,id:'b'}],read,()=>current,1)).rejects.toThrow('context_changed');expect(read).toHaveBeenCalledTimes(1);
  });
  it('snapshots client fields before asynchronous reads',async()=>{
    const input={...client};const result=await prepareClientExport([input],async()=>{input.name='Changed';return stats;},()=>true);expect(result[0].name).toBe(client.name);
  });
  it('refuses invalid statistics',async()=>{await expect(prepareClientExport([client],async()=>({...stats,totalSpent:NaN}),()=>true)).rejects.toThrow('invalid_export_stats');});
});
