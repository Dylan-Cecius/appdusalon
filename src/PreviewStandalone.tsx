import { PreviewDashboard, PreviewStats, PreviewClients } from './preview/PreviewOverview';
import PreviewPOS from './preview/PreviewPOS';
import { PreviewProvider } from './preview/PreviewProvider';
import { previewServices as services, previewMembers } from './preview/data';
import PreviewAgenda from './components/agenda/PreviewAgenda';
import { useEffect, useState } from 'react';
import {
  BarChart3, CalendarDays, ChevronRight, CircleDollarSign,
  Home, Package, Plus, Scissors,
  Settings, ShoppingCart, UserRound, Users,
  Bell, Boxes, Mail, MessageSquare, ReceiptText, type LucideIcon
} from 'lucide-react';

type View = 'dashboard'|'pos'|'agenda'|'clients'|'services'|'products'|'team'|'stats'|'reports'|'settings';

const nav: {id:View;label:string;icon:LucideIcon}[] = [
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

function SimpleTable({title,subtitle,rows,kind}:{title:string;subtitle:string;rows:string[][];kind:'service'|'product'|'team'}){return <div><div className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-1 text-slate-500">{subtitle}</p></div><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="mr-1 inline"/>Ajouter</button></div><Card className="mt-5 overflow-hidden">{rows.map((r,i)=><div key={i} className="flex items-center gap-4 border-b p-4 last:border-0"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">{kind==='service'?<Scissors/>:kind==='product'?<Boxes/>:<UserRound/>}</div><div className="flex-1"><p className="font-medium">{r[0]}</p><p className="text-sm text-slate-500">{r.slice(1).join(' · ')}</p></div><ChevronRight className="text-slate-400" size={18}/></div>)}</Card></div>}

function SettingsView(){const[notif,setNotif]=useState(true);const[booking,setBooking]=useState(true);return <div><h1 className="text-3xl font-semibold">Paramètres</h1><p className="mt-1 text-slate-500">Configuration générale du salon.</p><div className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Salon</h2><div className="mt-4 space-y-4"><label className="block text-sm">Nom du salon<input defaultValue="Salon Éclat" className="mt-1 w-full rounded-xl border p-2.5"/></label><label className="block text-sm">Email<input defaultValue="contact@salon-eclat.demo" className="mt-1 w-full rounded-xl border p-2.5"/></label><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white">Enregistrer</button></div></Card><Card className="p-5"><h2 className="font-semibold">Fonctionnalités</h2><div className="mt-4 space-y-4">{[[notif,setNotif,'Notifications','Recevoir les alertes importantes'],[booking,setBooking,'Réservation en ligne','Autoriser les réservations publiques']].map(([v,setV,a,b]:any)=><button key={a} onClick={()=>setV(!v)} className="flex w-full items-center justify-between rounded-xl border p-4 text-left"><div><p className="font-medium">{a}</p><p className="text-sm text-slate-500">{b}</p></div><span className={'h-6 w-11 rounded-full p-1 transition '+(v?'bg-indigo-600':'bg-slate-200')}><span className={'block h-4 w-4 rounded-full bg-white transition '+(v?'translate-x-5':'')}/></span></button>)}</div></Card></div></div>}

function readView(): View {
  const requested = new URLSearchParams(window.location.search).get('view');
  return nav.find(item => item.id === requested)?.id || 'dashboard';
}

function PreviewShell(){
  const [view, updateView] = useState(readView);
  useEffect(() => {
    const restoreView = () => updateView(readView());
    window.addEventListener('popstate', restoreView);
    return () => window.removeEventListener('popstate', restoreView);
  }, []);
  const setView = (next: View) => {
    if (next === view) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    window.history.pushState(window.history.state, '', url);
    updateView(next);
  };
  const current = nav.find(item => item.id === view)!;
  const rowsTeam=previewMembers.map(member=>[member.name, 'Collaborateur', '09:00–19:00']);
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-white md:flex md:flex-col">
        <div className="border-b p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><Scissors size={22}/></div><div><p className="font-semibold">L’App du Salon</p><p className="text-xs text-slate-500">Aperçu interactif V2</p></div></div></div>
        <div className="flex-1 space-y-1 p-3">{nav.map(n=>{const I=n.icon;return <button key={n.id} aria-current={view === n.id ? 'page' : undefined} onClick={()=>setView(n.id)} className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition '+(view===n.id?'bg-indigo-50 font-medium text-indigo-700':'text-slate-600 hover:bg-slate-50')}><I size={18}/>{n.label}</button>})}</div>
        <div className="border-t p-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium">Salon Éclat</p><p className="text-xs text-slate-500">Compte démo · Lifetime</p></div></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-7"><div className="flex items-center gap-3"><div className="md:hidden rounded-lg bg-indigo-600 p-2 text-white"><Scissors size={18}/></div><div><p className="text-sm font-medium">{current.label}</p><p className="text-xs text-slate-400">Démonstration · données fictives</p></div></div><div className="flex items-center gap-2"><button className="rounded-xl border p-2 text-slate-500"><Bell size={18}/></button><div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">D</div><span className="hidden text-sm font-medium sm:inline">Dylan</span></div></div></header>
        <div className="md:hidden flex gap-2 overflow-x-auto border-b bg-white px-3 py-2">{nav.map(n=><button key={n.id} aria-current={view === n.id ? 'page' : undefined} onClick={()=>setView(n.id)} className={'whitespace-nowrap rounded-full px-3 py-1.5 text-xs '+(view===n.id?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600')}>{n.label}</button>)}</div>
        <div className="p-4 md:p-7">
          {view==='dashboard'&&<PreviewDashboard openAgenda={() => setView('agenda')} />}
          {view==='pos'&&<PreviewPOS/>}
          {view==='agenda'&&<PreviewAgenda/>}
          {view==='clients'&&<PreviewClients/>}
          {view==='services'&&<SimpleTable title="Services" subtitle="Prestations proposées au salon" kind="service" rows={services.map(s=>[s.name,money(s.price),s.duration+' min'])}/>}
          {view==='products'&&<SimpleTable title="Produits & stock" subtitle="Inventaire et niveaux de stock" kind="product" rows={products}/>}
          {view==='team'&&<SimpleTable title="Équipe" subtitle="Membres et accès au salon" kind="team" rows={rowsTeam}/>}
          {view==='stats'&&<PreviewStats/>}
          {view==='reports'&&<div><h1 className="text-3xl font-semibold">Rapports</h1><p className="mt-1 text-slate-500">Exports et rapports automatiques.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{[['Rapport hebdomadaire',Mail,'Tous les lundis'],['SMS clients',MessageSquare,'Automatisations actives'],['CA & performance',CircleDollarSign,'PDF / Email']].map(([t,I,s]:any)=><Card key={t} className="p-5"><I className="text-indigo-600"/><p className="mt-4 font-medium">{t}</p><p className="mt-1 text-sm text-slate-500">{s}</p><button className="mt-4 text-sm font-medium text-indigo-600">Ouvrir →</button></Card>)}</div></div>}
          {view==='settings'&&<SettingsView/>}
        </div>
      </main>
    </div>
  </div>
}

export default function PreviewStandalone() {
  return <PreviewProvider><PreviewShell /></PreviewProvider>;
}
