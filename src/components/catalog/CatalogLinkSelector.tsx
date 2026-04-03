import { useState, useEffect } from 'react';
import { EquipmentCatalogLink } from '@/types/catalog';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BookOpen, Link2, Unlink, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CatalogLinkSelectorProps {
  equipmentId: string;
  equipmentIp: string;
  siteIdentifier: string;
  existingLink: EquipmentCatalogLink | null;
  onLinkChanged: () => void;
}

interface CatalogOption {
  catalogId: string;
  protocolId: string;
  label: string;
  manufacturer: string;
  model: string;
  protocol: string;
  registerCount: number;
}

export const CatalogLinkSelector = ({
  equipmentId, equipmentIp, siteIdentifier, existingLink, onLinkChanged,
}: CatalogLinkSelectorProps) => {
  const { fetchCatalogs, fetchCatalogDetail, linkCatalogToEquipment, unlinkCatalogFromEquipment } = useEquipmentCatalog();

  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string>('');

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      const catalogs = await fetchCatalogs();

      const allOptions: CatalogOption[] = [];

      // fetchCatalogs doesn't include full protocol details, so fetch each catalog's detail
      for (const catalog of catalogs) {
        const detail = await fetchCatalogDetail(catalog.id);
        if (detail?.protocols) {
          for (const protocol of detail.protocols) {
            allOptions.push({
              catalogId: catalog.id,
              protocolId: protocol.id,
              label: `${catalog.manufacturer} / ${catalog.model} / ${protocol.protocol}`,
              manufacturer: catalog.manufacturer,
              model: catalog.model,
              protocol: protocol.protocol,
              registerCount: protocol.register_count,
            });
          }
        }
      }

      setOptions(allOptions);
      setLoading(false);
    };

    loadOptions();
  }, [fetchCatalogs, fetchCatalogDetail]);

  const handleSelectChange = (value: string) => {
    setPendingSelection(value);
    setConfirmDialogOpen(true);
  };

  const handleConfirmLink = async () => {
    setConfirmDialogOpen(false);
    const option = options.find(o => o.protocolId === pendingSelection);
    if (!option) return;

    setLinking(true);
    try {
      const result = await linkCatalogToEquipment(equipmentId, option.protocolId, siteIdentifier);
      toast.success(`Catalog linked! ${result.matched}/${result.total} registers matched.`);
      onLinkChanged();
    } catch (error) {
      toast.error('Error linking catalog: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setLinking(false);
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await unlinkCatalogFromEquipment(equipmentId);
      toast.success('Catalog unlinked. Applied semantics are preserved.');
      onLinkChanged();
    } catch (error) {
      toast.error('Error unlinking: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setUnlinking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading catalogs...
      </div>
    );
  }

  if (existingLink) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle className="h-3 w-3" />
            Catalog Confirmed
          </Badge>
        </div>
        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {existingLink.catalog?.manufacturer} / {existingLink.catalog?.model}
              </div>
              <div className="text-xs text-muted-foreground">
                {existingLink.protocol?.protocol} • {existingLink.protocol?.register_count} registers
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnlink}
            disabled={unlinking}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          >
            {unlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        No catalogs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] gap-1">
          <BookOpen className="h-2.5 w-2.5" />
          No Catalog
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Select value={selectedValue} onValueChange={handleSelectChange} disabled={linking}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Link a catalog..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.protocolId} value={option.protocolId}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.manufacturer}</span>
                  <span>/</span>
                  <span>{option.model}</span>
                  <span>/</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">{option.protocol}</Badge>
                  <span className="text-muted-foreground">({option.registerCount} regs)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {linking && <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />}
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply semantic labels, units, data types, and scales from the catalog to matching variables for equipment <span className="font-mono font-medium">{equipmentIp}</span>.
              Existing semantics on matched variables will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLink} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link2 className="h-4 w-4 mr-2" />Apply Catalog
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};