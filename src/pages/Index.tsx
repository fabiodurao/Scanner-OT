import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow';
import { UnregisteredSitesBanner } from '@/components/dashboard/UnregisteredSitesBanner';
import { SitesViewToggle, SitesView } from '@/components/dashboard/SitesViewToggle';
import { SiteTypeFilter } from '@/components/dashboard/SiteTypeFilter';
import { SitesCardsGrid } from '@/components/dashboard/SitesCardsGrid';
import { SiteListView } from '@/components/dashboard/SiteListView';
import { SitesMap } from '@/components/dashboard/SitesMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Loader2, Building2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const {
    unknownSites,
    allSiteCards,
    globalStats,
    loadingStats,
    isLoading,
    refreshing,
    handleRefresh,
  } = useDashboardData();

  const [sitesView, setSitesView] = useState<SitesView>('cards');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  // Initialize type filter when data loads
  useEffect(() => {
    if (allSiteCards.length > 0 && selectedTypes.size === 0) {
      setSelectedTypes(new Set(allSiteCards.map(c => c.site_type || '__unregistered__')));
    }
  }, [allSiteCards]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of allSiteCards) {
      const key = card.site_type || '__unregistered__';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allSiteCards]);

  const filteredSiteCards = useMemo(() =>
    allSiteCards.filter(c => selectedTypes.has(c.site_type || '__unregistered__')),
    [allSiteCards, selectedTypes]
  );

  const handleToggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleRegisterSite = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/sites-management?register=${encodeURIComponent(identifier)}`);
  };

  const mapSites = filteredSiteCards.map(s => ({
    id: s.id,
    identifier: s.identifier,
    name: s.name,
    site_type: s.site_type,
    city: s.city,
    state: s.state,
    latitude: s.latitude,
    longitude: s.longitude,
    stats: s.stats,
    pcap: s.pcap,
  }));

  const renderSitesContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (allSiteCards.length === 0) {
      return (
        <SitesCardsGrid siteCards={[]} loadingStats={loadingStats} onRegisterSite={handleRegisterSite} />
      );
    }

    if (filteredSiteCards.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h3 className="font-medium text-lg mb-2">No sites match the selected filters</h3>
            <p className="text-muted-foreground text-sm">Select at least one site type above to see results.</p>
          </CardContent>
        </Card>
      );
    }

    if (sitesView === 'map') {
      return (
        <SitesMap
          sites={mapSites}
          onSiteClick={(identifier, id) => navigate(`/discovery/${identifier || id}`)}
        />
      );
    }

    if (sitesView === 'list') {
      return (
        <SiteListView
          sites={filteredSiteCards}
          loadingStats={loadingStats}
          onRegisterSite={handleRegisterSite}
        />
      );
    }

    return (
      <SitesCardsGrid
        siteCards={filteredSiteCards}
        loadingStats={loadingStats}
        onRegisterSite={handleRegisterSite}
      />
    );
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Centrii OT Scanner Overview</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Unregistered sites alert */}
        <UnregisteredSitesBanner count={unknownSites.length} />

        {/* Stats row */}
        <DashboardStatsRow
          totalSites={globalStats.totalSites}
          totalEquipment={globalStats.totalEquipment}
          totalVariables={globalStats.totalVariables}
          confirmedVariables={globalStats.confirmedVariables}
          hypothesisVariables={globalStats.hypothesisVariables}
          isLoading={isLoading}
          loadingStats={loadingStats}
          unknownSitesCount={unknownSites.length}
        />

        {/* Sites section */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground flex-shrink-0">Sites</h2>

            {!isLoading && allSiteCards.length > 0 && (
              <SiteTypeFilter
                typeCounts={typeCounts}
                selectedTypes={selectedTypes}
                onToggleType={handleToggleType}
              />
            )}

            <SitesViewToggle view={sitesView} onViewChange={setSitesView} />
          </div>

          {renderSitesContent()}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;