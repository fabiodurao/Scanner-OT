import { MainLayout } from '@/components/layout/MainLayout';
import { SiteCard } from '@/components/dashboard/SiteCard';
import { mockSites, getSiteStats } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

const Sites = () => {
  const [search, setSearch] = useState('');

  const filteredSites = mockSites.filter(
    site =>
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Sites</h1>
          <p className="text-muted-foreground mt-1">
            Manage your plants and power stations
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              stats={getSiteStats(site.id)}
            />
          ))}
        </div>

        {filteredSites.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No sites found
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Sites;