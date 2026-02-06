import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscoveryPage } from '@/hooks/useDiscoveryPage';
import { DiscoveryHeader } from '@/components/discovery/DiscoveryHeader';
import { DiscoveryStats } from '@/components/discovery/DiscoveryStats';
import { VariablesTab } from '@/components/discovery/VariablesTab';
import { HistoricalTab } from '@/components/discovery/HistoricalTab';
import { EquipmentTab } from '@/components/discovery/EquipmentTab';
import { NetworkTab } from '@/components/discovery/NetworkTab';
import { SiteSettingsTab } from '@/components/discovery/SiteSettingsTab';
import { AssetDetailSheet } from '@/components/network/AssetDetailSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Variable, Grid3x3, Server, Network as NetworkIcon, Settings } from 'lucide-react';

const countUniqueVariables = (variables: Array<{ SourceIp: string | null; DestinationIp: string | null; Address: number | null; FC: number | null }>): number => {
  const uniqueKeys = new Set<string>();
  for (const v of variables) {
    const key = `${v.SourceIp}-${v.DestinationIp}-${v.Address}-${v.FC}`;
    uniqueKeys.add(key);
  }
  return uniqueKeys.size;
};

const Discovery = () => {
  const { profile } = useAuth();
  const {
    siteId,
    site,
    stats,
    equipment,
    variables,
    discoveredVariables,
    networkAssets,
    loading,
    refreshing,
    syncing,
    loadingFiltered,
    networkLoading,
    activeTab,
    activeSourceIpFilter,
    selectedAsset,
    assetSheetOpen,
    handleRefresh,
    handleSyncEquipment,
    handleTableSourceIpFilter,
    handleTabChange,
    handleAssetClick,
    setAssetSheetOpen,
    loadData,
    refreshNetwork,
  } = useDiscoveryPage();

  const isAdmin = profile?.is_admin === true;
  const uniqueVariableCount = countUniqueVariables(variables);
  const slaveEquipment = equipment.filter(e => e.role === 'slave');
  const masterEquipment = equipment.filter(e => e.role === 'master');
  const allSourceIps = slaveEquipment.map(e => e.ip).sort();

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#2563EB] mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Loading discovery data...</p>
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
          siteId={siteId!}
          refreshing={refreshing}
          syncing={syncing}
          onRefresh={handleRefresh}
          onSyncEquipment={handleSyncEquipment}
        />

        {stats && (
          <DiscoveryStats 
            stats={stats} 
            slaveEquipmentCount={slaveEquipment.length}
          />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto">
            <TabsTrigger value="variables" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Variable className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Variables ({uniqueVariableCount})</span>
              <span className="sm:hidden">Vars</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Historical</span>
              <span className="sm:hidden">Hist</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Equipment ({equipment.length})</span>
              <span className="sm:hidden">Equip</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="text-xs sm:text-sm py-2 sm:py-1.5">
              <NetworkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Network ({networkAssets.length})</span>
              <span className="sm:hidden">Net</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-1.5">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Set</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="variables">
            <VariablesTab
              siteId={siteId!}
              variables={variables}
              activeSourceIpFilter={activeSourceIpFilter}
              allSourceIps={allSourceIps}
              loadingFiltered={loadingFiltered}
              onFilterBySourceIp={handleTableSourceIpFilter}
            />
          </TabsContent>
          
          <TabsContent value="historical">
            <HistoricalTab
              siteId={siteId!}
              discoveredVariables={discoveredVariables}
              onVariableUpdated={loadData}
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

          <TabsContent value="network">
            <NetworkTab
              networkAssets={networkAssets}
              networkLoading={networkLoading}
              onRefreshNetwork={refreshNetwork}
              onAssetClick={handleAssetClick}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <SiteSettingsTab 
                siteIdentifier={siteId!}
                siteName={site?.name}
                onDataCleared={loadData}
              />
            </TabsContent>
          )}
        </Tabs>

        <AssetDetailSheet
          asset={selectedAsset}
          open={assetSheetOpen}
          onOpenChange={setAssetSheetOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Discovery;