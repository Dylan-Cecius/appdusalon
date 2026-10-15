import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CartContents } from '../../src/components/CartContents';
import { createCartTransaction, type CartItem } from '../../src/lib/cartCheckout';
import type { NewTransaction } from '../../src/lib/transactions';
import '../../src/index.css';
const controls={calls:0,input:null as NewTransaction|null,finish:()=>{},fail:()=>{}};
Object.assign(window,{cartFixture:controls});
export function Fixture(){
  const [items,setItems]=useState<CartItem[]>([{id:'cut',name:'Coupe',price:18,duration:30,quantity:1,kind:'service'}]);
  return <main className="mx-auto max-w-md p-3"><CartContents items={items} activeStaff={[{id:'staff-2',name:'Alex',color:'#a78bfa',role:'Coiffeur'}]} onRemoveItem={id=>setItems(current=>current.filter(item=>item.id!==id))} onUpdateQuantity={(id,quantity)=>setItems(current=>current.map(item=>item.id===id?{...item,quantity}:item))} onCheckout={async(method,staffId)=>{
    const result=await createCartTransaction(items,method,staffId,input=>{
      controls.calls++;controls.input=input;
      return new Promise<{id:string}>((resolve,reject)=>{controls.finish=()=>resolve({id:'synthetic'});controls.fail=()=>reject(new Error('Synthetic failure'));});
    });
    setItems([]);return result;
  }} /></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
