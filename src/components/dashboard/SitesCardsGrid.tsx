import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteCard } from '@/hooks/useDashboardData';
import { SiteCardItem } from './SiteCardItem';
import { Building2 } from 'lucide-react';

interface SitesCardsGridProps {
  siteCards: SiteCard[];
  loadingStats: boolean;
  onRegisterSite: (identifier: string, e: React.MouseEvent) => void;
}

export const SitesCardsGrid = ({ siteCards, loadingStats, onRegisterSite }: SitesCardsGridProps) => {
  if (siteCards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No Sites Yet</h3>
          <p className="text-muted-foreground mb-4">Start by uploading a PCAP file or adding a site manually.</p>
          <div className="flex gap-2 justify-center">
            <Link to="/upload"><Button variant="outline">Upload PCAP</Button></Link>
            <Link to="/sites-management"><Button><Building2 className="h-4 w-4 mr-2" />Add Site</Button></Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {siteCards.map(siteCard => (
        <SiteCardItem
          key={siteCard.id}
          siteCard={siteCard}
          loadingStats={loadingStats}
          onRegisterSite={onRegisterSite}
        />
      ))}
    </div>
  );
};