import { useMemo, useState } from 'react';
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, CreditCard, Euro, Home, Package, Plus, Search, Scissors,
  Settings, ShoppingCart, TrendingUp, UserRound, Users, WalletCards,
  AlertTriangle, Bell, Boxes, Mail, MessageSquare, ReceiptText
} from 'lucide-react';

type View = 'dashboard'|'pos'|'agenda'|'clients'|'services'|'products'|'team'|'stats'|'reports'|'settings';

const nav: {id:View;label:string;icon:any}[] = [
  {id:'dashboard',label:'Tableau de bord',icon:Home},
  {id:'pos',label:'Caisse',icon:ShoppingCart},
  {id:'agenda',label:'Agenda',icon:CalendarDays},
  {id:'clients',label:'Clients',icon:Users},
  {id:'services',label:'Services',icon:Scissors},
  {id:'products',label:'Produits & stock',icon:Package},
  {id:'team',label:'Équipe',icon:UserRound},
  {id:'stats',label:'Statistiques',icon:BarChart3},
  {id:'reports',label:'Rapports',icon:ReceiptText},
  {id:'settings',label:'Paramètres',icon:Settings},
];

const services = [
  {id:'s1',name:'Coupe homme',price:25,duration:30},
  {id:'s2',name:'Coupe + barbe',price:35,duration:45},
  {id:'s3',name:'Barbe',price:15,duration:20},
  {id:'s4',name:'Coupe enfant',price:20,duration:25},
  {id:'s5',name:'Coloration',price:55,duration:60},
  {id:'s6',name:'Soin',price:18,duration:20},
];

const clients = [
  ['Sophie Martin','0471 21 45 87','12 visites','320 €'],
  ['Lucas Bernard','0486 44 12 09','8 visites','198 €'],
  ['Emma Dubois','0492 08 71 22','6 visites','165 €'],
  ['Thomas Leroy','0478 93 54 11','5 visites','140 €'],
  ['Julie Simon','0465 31 80 02','9 visites','252 €'],
];

const appts = [
  ['09:00','Sophie Martin','Coupe + barbe','Marie'],
  ['10:00','Lucas Bernard','Coupe homme','Thomas'],
  ['11:30','Emma Dubois','Coloration','Marie'],
  ['14:00','Thomas Leroy','Barbe','Thomas'],
  ['15:15','Julie Simon','Coupe homme','Marie'],
  ['17:00','Nicolas Petit','Coupe + barbe','Thomas'],
];

const products = [
  ['Shampoing réparateur','24','18 €','OK'],
  ['Cire coiffante mate','18','14 €','OK'],
  ["Huile d'argan",'4','26 €','Bas'],
  ['Spray thermo-protecteur','0','19 €','Rupture'],
  ['Peigne carbone','15','7 €','OK'],
];

const money=(n:number)=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n);

const Card=({children,className=''}:{children:any;className?:string})=>
  <div className={'rounded-2xl border border-slate-200 bg-white shadow-sm '+className}>{children}</div>;

function Dashboard(){
  return <div className="space-y-6">
    <div>
      <div className="text-sm text-slate-500">Jeudi 8 octobre 2026</div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bonjour Dylan</h1>
      <p className="mt-1 text-slate-500">Voici un aperçu de votre journée au salon.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      {[
        ['CA aujourd’hui','486 €','+12,8 %',Euro],
        ['Rendez-vous','14','3 à venir',CalendarDays],
        ['Clients','327','+8 ce mois',Users],
        ['Panier moyen','34,70 €','+4,1 %',TrendingUp],
      ].map(([a,b,c,I]:any)=><Card key={a} className="p-5">
        <div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{a}</p><p className="mt-2 text-3xl font-semibold">{b}</p><p className="mt-1 text-xs text-emerald-600">{c}</p></div><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><I size={20}/></div></div>
      </Card>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <Card className="p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Chiffre d’affaires</h2><p className="text-sm text-slate-500">7 derniers jours</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">+18,4 %</span></div>
        <div className="mt-6 flex h-56 items-end gap-4">
          {[42,58,52,77,64,92,81].map((h,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-indigo-500/90" style={{height:`${h}%`}}/><span className="text-xs text-slate-400">{['Ven','Sam','Dim','Lun','Mar','Mer','Jeu'][i]}</span></div>)}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Prochains rendez-vous</h2>
        <div className="mt-4 space-y-3">{appts.slice(0,4).map(a=><div key={a[0]} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="w-14 text-sm font-semibold text-indigo-600">{a[0]}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a[1]}</p><p className="truncate text-xs text-slate-500">{a[2]} · {a[3]}</p></div><ChevronRight size={16} className="text-slate-400"/></div>)}</div>
      </Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <h2 className="font-semibold">Activité récente</h2>
        <div className="mt-4 divide-y">{[
          ['Encaissement CB','Coupe + barbe · 35 €','il y a 8 min'],
          ['Nouveau client','Nicolas Petit','il y a 22 min'],
          ['Rendez-vous confirmé','Emma Dubois · 11:30','il y a 41 min'],
          ['Stock mis à jour','Huile d’argan · 4 unités','il y a 1 h'],
        ].map(x=><div key={x[0]} className="flex items-center gap-3 py-3"><CheckCircle2 size={18} className="text-emerald-500"/><div className="flex-1"><p className="text-sm font-medium">{x[0]}</p><p className="text-xs text-slate-500">{x[1]}</p></div><span className="text-xs text-slate-400">{x[2]}</span></div>)}</div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Stock à surveiller</h2>
        <div className="mt-4 space-y-3"><div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-medium">Huile d’argan</p><p className="text-xs text-amber-700">4 unités restantes</p></div><div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-medium">Spray thermo-protecteur</p><p className="text-xs text-red-700">Rupture de stock</p></div></div>
      </Card>
    </div>
  </div>
}

function POS(){
  const [cart,setCart]=useState<{id:string;name:string;price:number}[]>([]);
  const total=cart.reduce((s,x)=>s+x.price,0);
  return <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
    <div><h1 className="text-3xl font-semibold">Caisse</h1><p className="mt-1 text-slate-500">Clique sur une prestation pour l’ajouter au ticket.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{services.map(s=><button key={s.id} onClick={()=>setCart(c=>[...c,s])} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"><div className="flex justify-between"><Scissors className="text-indigo-600"/><span className="font-semibold">{money(s.price)}</span></div><p className="mt-4 font-medium">{s.name}</p><p className="text-sm text-slate-500">{s.duration} min</p></button>)}</div>
    </div>
    <Card className="h-fit p-5 lg:sticky lg:top-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Ticket</h2><ReceiptText className="text-slate-400"/></div>
      <div className="mt-4 min-h-48 space-y-2">{cart.length===0?<div className="flex h-44 flex-col items-center justify-center text-center text-slate-400"><ShoppingCart/><p className="mt-2 text-sm">Aucune prestation</p></div>:cart.map((x,i)=><div key={i} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{x.name}</span><span className="font-medium">{money(x.price)}</span></div>)}</div>
      <div className="mt-4 border-t pt-4"><div className="flex justify-between text-xl font-semibold"><span>Total</span><span>{money(total)}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!cart.length} className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-40"><WalletCards className="mx-auto mb-1" size={18}/>Espèces</button><button disabled={!cart.length} className="rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white disabled:opacity-40"><CreditCard className="mx-auto mb-1" size={18}/>Carte</button></div>{cart.length>0&&<button onClick={()=>setCart([])} className="mt-2 w-full rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">Vider le ticket</button>}</div>
    </Card>
  </div>
}

function Agenda(){return <div><div className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">Agenda</h1><p className="mt-1 text-slate-500">Jeudi 8 octobre</p></div><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="mr-1 inline"/>Nouveau rendez-vous</button></div><Card className="mt-5 overflow-hidden"><div className="grid grid-cols-[90px_1fr_1fr] border-b bg-slate-50 p-3 text-sm font-medium text-slate-500"><span>Heure</span><span>Marie</span><span>Thomas</span></div><div className="divide-y">{['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(t=><div key={t} className="grid min-h-16 grid-cols-[90px_1fr_1fr]"><div className="border-r p-3 text-xs text-slate-400">{t}</div>{[0,1].map(col=>{const a=appts.find((a,i)=>a[0].startsWith(t.slice(0,2))&&((a[3]==='Marie'?0:1)===col));return <div key={col} className="border-r p-2">{a&&<div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2"><p className="text-xs font-semibold text-indigo-700">{a[1]}</p><p className="text-xs text-indigo-500">{a[2]}</p></div>}</div>})}</div>)}</div></Card></div>}

function Clients(){const[q,setQ]=useState('');const data=clients.filter(c=>c.join(' ').toLowerCase().includes(q.toLowerCase()));return <div><div className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">Clients</h1><p className="mt-1 text-slate-500">327 clients enregistrés</p></div><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="mr-1 inline"/>Ajouter</button></div><div className="relative mt-5 max-w-md"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un client..." className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-200"/></div><Card className="mt-4 overflow-hidden"><div className="grid grid-cols-[1.4fr_1fr_.7fr_.7fr] bg-slate-50 p-3 text-xs font-medium uppercase tracking-wide text-slate-500"><span>Client</span><span>Téléphone</span><span>Visites</span><span>CA</span></div>{data.map(c=><div key={c[0]} className="grid grid-cols-[1.4fr_1fr_.7fr_.7fr] border-t p-4 text-sm"><span className="font-medium">{c[0]}</span><span className="text-slate-500">{c[1]}</span><span>{c[2]}</span><span className="font-medium">{c[3]}</span></div>)}</Card></div>}

function SimpleTable({title,subtitle,rows,kind}:{title:string;subtitle:string;rows:string[][];kind:'service'|'product'|'team'}){return <div><div className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-1 text-slate-500">{subtitle}</p></div><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="mr-1 inline"/>Ajouter</button></div><Card className="mt-5 overflow-hidden">{rows.map((r,i)=><div key={i} className="flex items-center gap-4 border-b p-4 last:border-0"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{kind==='service'?<Scissors/>:kind==='product'?<Boxes/>:<UserRound/>}</div><div className="flex-1"><p className="font-medium">{r[0]}</p><p className="text-sm text-slate-500">{r.slice(1).join(' · ')}</p></div><ChevronRight className="text-slate-400" size={18}/></div>)}</Card></div>}

function Stats(){return <div><h1 className="text-3xl font-semibold">Statistiques</h1><p className="mt-1 text-slate-500">Performance du salon sur les 30 derniers jours.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{[['CA mensuel','8 740 €','+11,2 %'],['Prestations','286','+7,4 %'],['Nouveaux clients','38','+15,1 %']].map(x=><Card key={x[0]} className="p-5"><p className="text-sm text-slate-500">{x[0]}</p><p className="mt-2 text-3xl font-semibold">{x[1]}</p><p className="mt-1 text-sm text-emerald-600">{x[2]}</p></Card>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Prestations les plus vendues</h2><div className="mt-5 space-y-4">{[['Coupe homme',92],['Coupe + barbe',71],['Barbe',48],['Coupe enfant',34]].map(x=><div key={x[0] as string}><div className="mb-1 flex justify-between text-sm"><span>{x[0]}</span><span>{x[1]}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{width:`${x[1]}%`}}/></div></div>)}</div></Card><Card className="p-5"><h2 className="font-semibold">Répartition des paiements</h2><div className="mt-8 flex items-center justify-around"><div className="flex h-36 w-36 items-center justify-center rounded-full border-[22px] border-indigo-500"><span className="text-xl font-semibold">64%</span></div><div className="space-y-3 text-sm"><p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-indigo-500"/>Carte 64%</p><p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-emerald-500"/>Espèces 36%</p></div></div></Card></div></div>}

function SettingsView(){const[notif,setNotif]=useState(true);const[booking,setBooking]=useState(true);return <div><h1 className="text-3xl font-semibold">Paramètres</h1><p className="mt-1 text-slate-500">Configuration générale du salon.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Salon</h2><div className="mt-4 space-y-4"><label className="block text-sm">Nom du salon<input defaultValue="Salon Éclat" className="mt-1 w-full rounded-xl border p-2.5"/></label><label className="block text-sm">Email<input defaultValue="contact@salon-eclat.demo" className="mt-1 w-full rounded-xl border p-2.5"/></label><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white">Enregistrer</button></div></Card><Card className="p-5"><h2 className="font-semibold">Fonctionnalités</h2><div className="mt-4 space-y-4">{[[notif,setNotif,'Notifications','Recevoir les alertes importantes'],[booking,setBooking,'Réservation en ligne','Autoriser les réservations publiques']].map(([v,setV,a,b]:any)=><button key={a} onClick={()=>setV(!v)} className="flex w-full items-center justify-between rounded-xl border p-4 text-left"><div><p className="font-medium">{a}</p><p className="text-sm text-slate-500">{b}</p></div><span className={'h-6 w-11 rounded-full p-1 transition '+(v?'bg-indigo-600':'bg-slate-200')}><span className={'block h-4 w-4 rounded-full bg-white transition '+(v?'translate-x-5':'')}/></span></button>)}</div></Card></div></div>}

export default function PreviewStandalone(){
  const [view,setView]=useState<View>('dashboard');
  const current=useMemo(()=>nav.find(n=>n.id===view)!,[view]);
  const rowsTeam=[['Marie Dupont','Coiffeuse','09:00–19:00'],['Thomas Martin','Barbier','09:00–19:00'],['Sophie Laurent','Esthéticienne','10:00–18:00']];
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-white md:flex md:flex-col">
        <div className="border-b p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><Scissors size={22}/></div><div><p className="font-semibold">L’App du Salon</p><p className="text-xs text-slate-500">Preview V2 autonome</p></div></div></div>
        <div className="flex-1 space-y-1 p-3">{nav.map(n=>{const I=n.icon;return <button key={n.id} onClick={()=>setView(n.id)} className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition '+(view===n.id?'bg-indigo-50 font-medium text-indigo-700':'text-slate-600 hover:bg-slate-50')}><I size={18}/>{n.label}</button>})}</div>
        <div className="border-t p-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium">Salon Éclat</p><p className="text-xs text-slate-500">Compte démo · Lifetime</p></div></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-7"><div className="flex items-center gap-3"><div className="md:hidden rounded-lg bg-indigo-600 p-2 text-white"><Scissors size={18}/></div><div><p className="text-sm font-medium">{current.label}</p><p className="text-xs text-slate-400">Mode démo local · aucune donnée réelle</p></div></div><div className="flex items-center gap-2"><button className="rounded-xl border p-2 text-slate-500"><Bell size={18}/></button><div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">D</div><span className="hidden text-sm font-medium sm:inline">Dylan</span></div></div></header>
        <div className="md:hidden flex gap-2 overflow-x-auto border-b bg-white px-3 py-2">{nav.map(n=><button key={n.id} onClick={()=>setView(n.id)} className={'whitespace-nowrap rounded-full px-3 py-1.5 text-xs '+(view===n.id?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600')}>{n.label}</button>)}</div>
        <div className="p-4 md:p-7">
          {view==='dashboard'&&<Dashboard/>}
          {view==='pos'&&<POS/>}
          {view==='agenda'&&<Agenda/>}
          {view==='clients'&&<Clients/>}
          {view==='services'&&<SimpleTable title="Services" subtitle="Prestations proposées au salon" kind="service" rows={services.map(s=>[s.name,money(s.price),s.duration+' min'])}/>}
          {view==='products'&&<SimpleTable title="Produits & stock" subtitle="Inventaire et niveaux de stock" kind="product" rows={products}/>}
          {view==='team'&&<SimpleTable title="Équipe" subtitle="Membres et accès au salon" kind="team" rows={rowsTeam}/>}
          {view==='stats'&&<Stats/>}
          {view==='reports'&&<div><h1 className="text-3xl font-semibold">Rapports</h1><p className="mt-1 text-slate-500">Exports et rapports automatiques.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{[['Rapport hebdomadaire',Mail,'Tous les lundis'],['SMS clients',MessageSquare,'Automatisations actives'],['CA & performance',CircleDollarSign,'PDF / Email']].map(([t,I,s]:any)=><Card key={t} className="p-5"><I className="text-indigo-600"/><p className="mt-4 font-medium">{t}</p><p className="mt-1 text-sm text-slate-500">{s}</p><button className="mt-4 text-sm font-medium text-indigo-600">Ouvrir →</button></Card>)}</div></div>}
          {view==='settings'&&<SettingsView/>}
        </div>
      </main>
    </div>
  </div>
}
