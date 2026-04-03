import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscoveryPage } from '@/hooks/useDiscoveryPage';
import { DiscoveryHeader } from '@/components/discovery/DiscoveryHeader';
import { DiscoveryStats } from '@/components/discovery/DiscoveryStats';
import { HistoricalTab } from '@/components/discovery/HistoricalTab';
import { EquipmentTab } from '@/components/discovery/EquipmentTab';
import { SiteSettingsTab } from '@/components/discovery/SiteSettingsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Grid3x3, Server, Settings } from 'lucide-react';

const Discovery = () => {
  const { profile } = useAuth();
  const {
    siteId,
    site,
    stats,
    equipment,
    discoveredVariables,
    loading,
    refreshing,
    syncing,
    activeTab,
    handleRefresh,
    handleSyncEquipment,
    handleTabChange,
    loadData,
  } = useDiscoveryPage();

  const isAdmin = profile?.is_admin === true;
  const slaveEquipment = equipment.filter(e => e.role === 'slave');
  const masterEquipment = equipment.filter(e => e.role === 'master');

  // Override stats.sampleCount with the real count from learning_samples
  const [realSampleCount, setRealSampleCount] = React.useState<number | null>(null);
  const displayStats = stats && realSampleCount !== null
    ? { ...stats, sampleCount: realSampleCount }
    : stats;

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Loading discovery data...</p>
            {siteId && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">Site: {siteId}</p>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!siteId) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-8">
          <div className="text-center py-12 text-muted-foreground">
            <p>No site ID provided</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 sm:p-8">
        <DiscoveryHeader
          site={site}
          siteId={siteId}
          refreshing={refreshing}
          syncing={syncing}
          onRefresh={handleRefresh}
          onSyncEquipment={handleSyncEquipment}
        />

        {displayStats && (
          <DiscoveryStats
            stats={displayStats}
            slaveEquipmentCount={slaveEquipment.length}
          />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className={`w-full grid h-auto ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="historical" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Variables ({discoveredVariables.length})</span>
              <span className="sm:hidden">Variables</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Equipment ({equipment.length})</span>
              <span className="sm:hidden">Equip</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-1.5">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Set</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="historical">
            <HistoricalTab
              siteId={siteId}
              discoveredVariables={discoveredVariables}
              onVariableUpdated={loadData}
              onSampleCountLoaded={setRealSampleCount}
            />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentTab
              equipment={equipment}
              slaveEquipmentCount={slaveEquipment.length}
              masterEquipmentCount={masterEquipment.length}
              syncing={syncing}
              onSyncEquipment={handleSyncEquipment}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <SiteSettingsTab
                siteIdentifier={siteId}
                siteName={site?.name}
                onDataCleared={loadData}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Discovery;