import ProAgenda from '@/components/agenda/ProAgenda';
import MainLayout from '@/components/MainLayout';

const AgendaPage = () => {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-80px)]">
        <ProAgenda />
      </div>
    </MainLayout>
  );
};

export default AgendaPage;
