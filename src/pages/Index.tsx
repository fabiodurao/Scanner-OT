import { MainLayout } from '@/components/layout/MainLayout';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { SiteCard } from '@/components/dashboard/SiteCard';
import { mockSites, mockEquipment, mockVariables, getSiteStats } from '@/data/mockData';

const Index = () => {
  const totalEquipment = mockEquipment.length;
  const totalVariables = mockVariables.length;
  const confirmedVariables = mockVariables.filter(
    v => v.learning_state === 'confirmed' || v.learning_state === 'published'
  ).length;

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do Middleware OT CyberEnergia
          </p>
        </div>

        <StatsOverview
          totalSites={mockSites.length}
          totalEquipment={totalEquipment}
          totalVariables={totalVariables}
          confirmedVariables={confirmedVariables}
        />

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Sites / Plantas</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                stats={getSiteStats(site.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;