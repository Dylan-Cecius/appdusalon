import { describe, expect, it, vi } from 'vitest';
import { createCartTransaction, type CartItem } from './cartCheckout';
const items:CartItem[]=[{id:'service',name:'Coupe',price:18,duration:30,quantity:1,kind:'service'}];
describe('cart checkout confirmation',()=>{
  it('forwards the selected staff and method with a basket snapshot',async()=>{
    const create=vi.fn().mockResolvedValue({id:'confirmed'});
    await expect(createCartTransaction(items,'card','staff-2',create)).resolves.toEqual({id:'confirmed'});
    expect(create).toHaveBeenCalledWith({items,totalAmount:18,paymentMethod:'card',staffId:'staff-2'});
    expect(create.mock.calls[0][0].items).not.toBe(items);
    expect(create.mock.calls[0][0].items[0]).not.toBe(items[0]);
  });
  it('waits for the actual result instead of accepting the start of a request',async()=>{
    let resolve!:(value:{id:string})=>void;
    let settled=false;
    const pending=createCartTransaction(items,'cash',undefined,()=>new Promise<{id:string}>(done=>{resolve=done;})).then(()=>{settled=true;});
    await Promise.resolve();expect(settled).toBe(false);
    resolve({id:'confirmed'});await pending;expect(settled).toBe(true);
  });
  it('propagates failures and rejects unconfirmed responses without altering items',async()=>{
    await expect(createCartTransaction(items,'cash',undefined,async()=>{throw new Error('offline');})).rejects.toThrow('offline');
    await expect(createCartTransaction(items,'cash',undefined,async()=>undefined)).rejects.toThrow('non confirmé');
    expect(items[0].quantity).toBe(1);
  });
  it('uses cents and normalizes the optional staff selector',async()=>{
    const create=vi.fn().mockResolvedValue({id:'ok'});
    await createCartTransaction([{...items[0],price:0.1,quantity:3}],'cash','none',create);
    expect(create.mock.calls[0][0]).toMatchObject({totalAmount:0.3,staffId:undefined});
  });
  it.each([[],[{...items[0],quantity:0}],[{...items[0],price:NaN}],[{...items[0],quantity:1.5}],[{...items[0],price:0}]].map(basket => ({ basket })))('rejects an invalid basket before creating anything',async ({basket})=>{
    const create=vi.fn();await expect(createCartTransaction(basket,'cash',undefined,create)).rejects.toThrow();expect(create).not.toHaveBeenCalled();
  });
});
