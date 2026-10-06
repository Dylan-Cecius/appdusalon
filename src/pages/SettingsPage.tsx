import Settings from '@/components/Settings';
import MainLayout from '@/components/MainLayout';

const SettingsPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Configuration</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Paramètres</h2>
          <p className="mt-2 text-sm text-muted-foreground">Configurez le salon, les accès, les horaires et les préférences de fonctionnement.</p>
        </div>
        <Settings />
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
