import { describe, expect, it, vi } from 'vitest';
import { readCompleteRows } from './readCompleteRows';
const row = (id: string) => ({ id });
describe('complete authorized row reads', () => {
  it('loads every page and never assumes the server default limit is complete', async () => {
    const read = vi.fn().mockResolvedValueOnce({data:[row('a'),row('b')],count:3,error:null}).mockResolvedValueOnce({data:[row('c')],count:3,error:null});
    expect(await readCompleteRows(read,()=>true,2)).toEqual([row('a'),row('b'),row('c')]);
    expect(read.mock.calls).toEqual([[0,1],[2,3]]);
  });
  it('accepts a successful empty collection', async () => { expect(await readCompleteRows(async()=>({data:[],count:0,error:null}),()=>true)).toEqual([]); });
  it.each([
    {data:null,count:0,error:null}, {data:[],count:null,error:null}, {data:[],count:1,error:null},
    {data:[row('a'),row('a')],count:2,error:null}, {data:[row('a')],count:0,error:null},
  ])('rejects incomplete or inconsistent pages', async page => { await expect(readCompleteRows(async()=>page,()=>true)).rejects.toThrow(); });
  it('propagates query failure instead of converting it to an empty list', async () => { await expect(readCompleteRows(async()=>({data:[],count:0,error:new Error('denied')}),()=>true)).rejects.toThrow('denied'); });
  it('rejects a count change between pages', async () => {
    const read=vi.fn().mockResolvedValueOnce({data:[row('a')],count:2,error:null}).mockResolvedValueOnce({data:[row('b')],count:3,error:null});
    await expect(readCompleteRows(read,()=>true,1)).rejects.toThrow('snapshot_changed');
  });
  it('discards an old salon response and stops further pages', async () => {
    let active=true; const read=vi.fn(async()=>{active=false;return {data:[row('a')],count:5,error:null};});
    expect(await readCompleteRows(read,()=>active,1)).toBeNull();expect(read).toHaveBeenCalledTimes(1);
  });
});
