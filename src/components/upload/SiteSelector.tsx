import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Site } from '@/types/upload';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2, MapPin, ExternalLink, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SiteSelectorProps {
  selectedSiteId: string | null;
  onSelectSite: (site: Site | null) => void;
}

export const SiteSelector = ({ selectedSiteId, onSelectSite }: SiteSelectorProps) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('name');

    if (!error) {
      setSites(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleSelectChange = (value: string) => {
    if (value === 'manage') {
      navigate('/sites-management');
    } else {
      const site = sites.find(s => s.id === value);
      onSelectSite(site || null);
    }
  };

  const handleCopyUUID = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopied(true);
      toast.success('UUID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy UUID');
    }
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sites...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Site</Label>
      <div className="flex gap-2">
        <Select value={selectedSiteId || ''} onValueChange={handleSelectChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map(site => (
              <SelectItem key={site.id} value={site.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{site.name}</span>
                    {(site.city || site.state) && (
                      <span className="text-xs text-muted-foreground">
                        {[site.city, site.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
            {sites.length === 0 && (
              <SelectItem value="none" disabled>
                No sites registered
              </SelectItem>
            )}
            <SelectItem value="manage" className="text-[#2563EB]">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Manage sites...
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show selected site details */}
      {selectedSite && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg border text-sm">
          <div className="font-medium">{selectedSite.name}</div>
          {(selectedSite.city || selectedSite.state) && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {[selectedSite.city, selectedSite.state].filter(Boolean).join(', ')}
            </div>
          )}
          {selectedSite.unique_id && (
            <div className="mt-2 flex items-center gap-2">
              <code className="text-xs bg-secondary px-2 py-1 rounded border font-mono flex-1 truncate">
                {selectedSite.unique_id}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
                onClick={() => handleCopyUUID(selectedSite.unique_id!)}
                title="Copy UUID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};