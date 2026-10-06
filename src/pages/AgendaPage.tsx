import ProAgenda from '@/components/agenda/ProAgenda';
import MainLayout from '@/components/MainLayout';

const AgendaPage = () => {
  return (
    <MainLayout>
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Planning</p>
          <h2 className="text-3xl font-semibold tracking-tight">Agenda</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visualisez les rendez-vous, les disponibilités et l’activité de l’équipe.</p>
        </div>
        <div className="v2-panel min-h-[calc(100vh-190px)] overflow-hidden p-1 sm:p-2">
          <ProAgenda />
        </div>
      </div>
    </MainLayout>
  );
};

export default AgendaPage;
