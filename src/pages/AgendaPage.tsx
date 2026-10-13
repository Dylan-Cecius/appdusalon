import ProAgenda from '@/components/agenda/ProAgenda';
import MainLayout from '@/components/MainLayout';

const AgendaPage = () => {
  return (
    <MainLayout>
      <div className="-mx-1 sm:-mx-2">
        <ProAgenda />
      </div>
    </MainLayout>
  );
};

export default AgendaPage;
