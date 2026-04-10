import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Map as MapIcon, List, Plus } from 'lucide-react';

export type SitesView = 'cards' | 'map' | 'list';

interface SitesViewToggleProps {
  view: SitesView;
  onViewChange: (view: SitesView) => void;
}

export const SitesViewToggle = ({ view, onViewChange }: SitesViewToggleProps) => {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="flex items-center border rounded-lg overflow-hidden">
        <button
          onClick={() => onViewChange('cards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'cards' ? 'bg-[#2563EB] text-white' : 'bg-card text-muted-foreground hover:bg-accent'}`}
          title="Card view"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Cards</span>
        </button>
        <button
          onClick={() => onViewChange('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${view === 'list' ? 'bg-[#2563EB] text-white' : 'bg-card text-muted-foreground hover:bg-accent'}`}
          title="List view"
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={() => onViewChange('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${view === 'map' ? 'bg-[#2563EB] text-white' : 'bg-card text-muted-foreground hover:bg-accent'}`}
          title="Map view"
        >
          <MapIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Map</span>
        </button>
      </div>
      <Link to="/sites-management">
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />Add Site
        </Button>
      </Link>
    </div>
  );
};