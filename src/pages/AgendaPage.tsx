import ProAgenda from '@/components/agenda/ProAgenda';
import MainLayout from '@/components/MainLayout';

const AgendaPage = () => {
  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-7rem)] min-h-[600px] flex-col">
        <ProAgenda />
      </div>
    </MainLayout>
  );
};

export default AgendaPage;
