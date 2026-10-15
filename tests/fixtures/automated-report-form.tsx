import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AutomatedReportForm } from '../../src/components/AutomatedReportForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../src/components/ui/dialog';
import type { AutomatedReport, CreateAutomatedReportData } from '../../src/lib/automatedReportConfig';
import '../../src/index.css';
const initial: AutomatedReport = { id:'r',user_id:'synthetic',report_name:'Rapport fictif',frequency:'weekly',recipient_emails:['test@example.test'],report_types:['revenue'],is_active:false,last_sent_at:null,next_send_at:null,time_of_day:'09:00:00',day_of_week:1,day_of_month:null,created_at:'2026-10-15T10:00:00Z',updated_at:'2026-10-15T10:00:00Z' };
const requests: { data: CreateAutomatedReportData; revision?: string; resolve: (value: { id: string }) => void; reject: (error: Error) => void }[] = [];
const save = (data: CreateAutomatedReportData, revision?: string) => new Promise<{id:string}>((resolve,reject)=>requests.push({data,revision,resolve,reject}));
Object.assign(window, { reportFormFixture: { count:()=>requests.length, revision:(i:number)=>requests[i].revision, finish:(i:number,id='r')=>requests[i].resolve({id}), fail:(i:number)=>requests[i].reject(new Error('Synthetic failure')) } });
function Fixture() {
  const [open,setOpen]=useState(false); const pending=useRef(false); const [report,setReport]=useState(initial);
  return <main className="p-4"><button onClick={()=>setReport({...initial,report_name:'Nouvelle version serveur',updated_at:'2026-10-15T11:00:00Z'})}>Actualiser la fixture</button>
    <Dialog open={open} onOpenChange={value=>{if(!pending.current)setOpen(value);}}><DialogTrigger asChild><button>Modifier le rapport fictif</button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Configuration fictive</DialogTitle><DialogDescription>Aucun envoi ni backend.</DialogDescription></DialogHeader>
        <AutomatedReportForm editingReport={report} onSubmit={save} onPendingChange={value=>{pending.current=value;}} onClose={()=>setOpen(false)} />
      </DialogContent></Dialog>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
