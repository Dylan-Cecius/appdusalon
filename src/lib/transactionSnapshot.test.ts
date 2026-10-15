import { describe, expect, it, vi } from 'vitest';
import { readTransactionSnapshot, type TransactionPage } from './transactionSnapshot';
import { createLatestRequestScope } from './latestRequestScope';
const row = (id:string) => ({ id,total_amount:40,payment_method:'cash',transaction_date:'2026-10-15T10:00:00Z',items:[],transaction_payments:[] });
const page = (ids:string[],count:number):TransactionPage => ({data:ids.map(row),count,error:null});
describe('complete authorized transaction snapshot', () => {
  it('continues beyond a server page limit and returns one complete result', async () => {
    const read=vi.fn().mockResolvedValueOnce(page(['a','b'],3)).mockResolvedValueOnce(page(['c'],3));
    expect((await readTransactionSnapshot(read,()=>true,2))?.map(tx=>tx.id)).toEqual(['a','b','c']);
    expect(read.mock.calls).toEqual([[0,1],[2,3]]);
  });
  it('accepts a genuinely empty authorized snapshot', async () => expect(await readTransactionSnapshot(async()=>page([],0),()=>true)).toEqual([]));
  it('rejects a partial total when a later read fails', async () => {
    const read=vi.fn().mockResolvedValueOnce(page(['a'],2)).mockResolvedValueOnce({data:null,count:null,error:new Error('offline')});
    await expect(readTransactionSnapshot(read,()=>true,1)).rejects.toThrow('offline');
  });
  it.each([
    [page(['a'],2),page([],2)], [page(['a'],2),page(['b'],3)], [page(['a'],2),page(['a'],2)],
  ])('rejects missing or moving pages', async(first,second) => {
    const read=vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await expect(readTransactionSnapshot(read,()=>true,1)).rejects.toThrow();
  });
  it('does not accept an unspecified count as a complete list',async()=> {
    await expect(readTransactionSnapshot(async()=>({data:[row('a')],error:null,count:null}),()=>true)).rejects.toThrow('transaction_read_incomplete');
  });
  it('drops a pending response after the salon changes and makes no further request', async () => {
    const scope=createLatestRequestScope();scope.setContext('user:one');
    let finish!:(value:TransactionPage)=>void;
    const read=vi.fn(()=>new Promise<TransactionPage>(resolve=>{finish=resolve;}));
    const pending=readTransactionSnapshot(read,scope.begin('user:one')!,1);
    scope.setContext('user:two');finish(page(['a'],2));
    expect(await pending).toBeNull();expect(read).toHaveBeenCalledTimes(1);
  });
  it('drops an older refresh even if it completes after a newer one', async () => {
    const scope=createLatestRequestScope();scope.setContext('user:one');
    let finish!:(value:TransactionPage)=>void;
    const old=readTransactionSnapshot(()=>new Promise<TransactionPage>(resolve=>{finish=resolve;}),scope.begin('user:one')!);
    const fresh=await readTransactionSnapshot(async()=>page(['fresh'],1),scope.begin('user:one')!);
    finish(page(['old'],1));
    expect(fresh?.[0].id).toBe('fresh');expect(await old).toBeNull();
  });
});
