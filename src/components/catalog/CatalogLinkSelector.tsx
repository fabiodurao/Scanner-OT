import { useState, useEffect, useRef, useCallback } from 'react';
import { EquipmentCatalogLink } from '@/types/catalog';
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BookOpen, Link2, Unlink, Loader2, CheckCircle, Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CatalogLinkSelectorProps {
  equipmentId: string;
  equipmentIp: string;
  siteIdentifier: string;
  existingLink: EquipmentCatalogLink | null;
  existingLinks?: EquipmentCatalogLink[];
  onLinkChanged: () => void;
}

interface CatalogOption {
  catalogId: string;
  protocolId: string;
  manufacturer: string;
  model: string;
  protocol: string;
  registerCount: number;
  searchText: string;
}

export const CatalogLinkSelector = ({
  equipmentId, equipmentIp, siteIdentifier, existingLink, existingLinks, onLinkChanged,
}: CatalogLinkSelectorProps) => {
  const { fetchCatalogs, fetchCatalogDetail, linkCatalogToEquipment, unlinkSingleCatalogLink } = useEquipmentCatalog();

  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<CatalogOption | null>(null);
  const [showAddSearch, setShowAddSearch] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use existingLinks array if provided, otherwise fall back to single existingLink
  const allLinks = existingLinks && existingLinks.length > 0
    ? existingLinks
    : existingLink
      ? [existingLink]
      : [];

  // Get IDs of already-linked catalog protocols to exclude from search
  const linkedProtocolIds = new Set(allLinks.map(l => l.catalog_protocol_id));

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      const catalogs = await fetchCatalogs();

      const allOptions: CatalogOption[] = [];

      for (const catalog of catalogs) {
        const detail = await fetchCatalogDetail(catalog.id);
        if (detail?.protocols) {
          for (const protocol of detail.protocols) {
            const searchText = `${catalog.manufacturer} ${catalog.model} ${protocol.protocol}`.toLowerCase();
            allOptions.push({
              catalogId: catalog.id,
              protocolId: protocol.id,
              manufacturer: catalog.manufacturer,
              model: catalog.model,
              protocol: protocol.protocol,
              registerCount: protocol.register_count,
              searchText,
            });
          }
        }
      }

      setOptions(allOptions);
      setLoading(false);
    };

    loadOptions();
  }, [fetchCatalogs, fetchCatalogDetail]);

  // Filter options: exclude already linked + apply search
  const filteredOptions = useCallback(() => {
    let filtered = options.filter(o => !linkedProtocolIds.has(o.protocolId));

    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(/[\s\/]+/).filter(Boolean);
      filtered = filtered.filter(option =>
        terms.every(term => option.searchText.includes(term))
      );
    }

    return filtered;
  }, [options, searchQuery, linkedProtocolIds])();

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setShowAddSearch(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectOption = (option: CatalogOption) => {
    setPendingSelection(option);
    setIsOpen(false);
    setSearchQuery(`${option.manufacturer} / ${option.model} / ${option.protocol}`);
    setConfirmDialogOpen(true);
  };

  const handleConfirmLink = async () => {
    setConfirmDialogOpen(false);
    if (!pendingSelection) return;

    setLinking(true);
    try {
      const result = await linkCatalogToEquipment(equipmentId, pendingSelection.protocolId, siteIdentifier);
      toast.success(`Catalog linked! ${result.matched}/${result.total} registers matched.`);
      onLinkChanged();
      setShowAddSearch(false);
    } catch (error) {
      toast.error('Error linking catalog: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setLinking(false);
    setSearchQuery('');
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setPendingSelection(null);
    setSearchQuery('');
  };

  const handleUnlinkSingle = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      await unlinkSingleCatalogLink(linkId);
      toast.success('Catalog unlinked. Applied semantics are preserved.');
      onLinkChanged();
    } catch (error) {
      toast.error('Error unlinking: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setUnlinkingId(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleShowAddSearch = () => {
    setShowAddSearch(true);
    setSearchQuery('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancelAdd = () => {
    setShowAddSearch(false);
    setSearchQuery('');
    setIsOpen(false);
  };

  // Highlight matching text segments
  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const terms = searchQuery.toLowerCase().split(/[\s\/]+/).filter(Boolean);
    let result = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '§$1§');
    }
    const parts = result.split('§');
    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = terms.some(t => part.toLowerCase() === t);
          return isMatch ? (
            <span key={i} className="bg-blue-100 text-blue-800 font-semibold rounded px-0.5">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  };

  // Check if there are more catalogs available to link
  const availableToLink = options.filter(o => !linkedProtocolIds.has(o.protocolId));
  const canAddMore = availableToLink.length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading catalogs...
      </div>
    );
  }

  // Render the search input (used both for initial and "add more")
  const renderSearchInput = () => (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search manufacturer / model / protocol..."
          className="h-8 text-xs pl-8 pr-8"
          disabled={linking}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
            onClick={handleClearSearch}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              {searchQuery ? 'No catalogs match your search' : 'No more catalogs available'}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={`${option.catalogId}-${option.protocolId}`}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left flex items-center gap-2 text-xs transition-colors border-b last:border-b-0',
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-slate-50'
                )}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="font-medium truncate">
                    {highlightMatch(option.manufacturer)}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="truncate">
                    {highlightMatch(option.model)}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 flex-shrink-0">
                    {highlightMatch(option.protocol)}
                  </Badge>
                </div>
                <span className="text-muted-foreground flex-shrink-0 ml-1">
                  ({option.registerCount} regs)
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  // No links yet — show search
  if (allLinks.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1">
            <BookOpen className="h-2.5 w-2.5" />
            No Catalog
          </Badge>
        </div>

        {options.length === 0 ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            No catalogs available
          </div>
        ) : (
          renderSearchInput()
        )}

        {linking && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Applying catalog...
          </div>
        )}

        {/* Confirm dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) handleCancelConfirm(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply Catalog?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    This will apply semantic labels, units, data types, and scales from the catalog to matching variables for equipment <span className="font-mono font-medium">{equipmentIp}</span>.
                  </p>
                  {pendingSelection && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm text-blue-900">
                            {pendingSelection.manufacturer} / {pendingSelection.model}
                          </div>
                          <div className="text-xs text-blue-700">
                            {pendingSelection.protocol} • {pendingSelection.registerCount} registers
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-amber-700">
                    Existing semantics on matched variables will be overwritten.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelConfirm}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLink} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                <Link2 className="h-4 w-4 mr-2" />Apply Catalog
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Has links — show them + optional add more
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
          <CheckCircle className="h-3 w-3" />
          {allLinks.length === 1 ? 'Catalog Confirmed' : `${allLinks.length} Catalogs Confirmed`}
        </Badge>
      </div>

      {/* List of linked catalogs */}
      <div className="space-y-1.5">
        {allLinks.map((link) => (
          <div key={link.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {link.catalog?.manufacturer} / {link.catalog?.model}
                </div>
                <div className="text-xs text-muted-foreground">
                  {link.protocol?.protocol} • {link.protocol?.register_count} registers
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnlinkSingle(link.id)}
              disabled={unlinkingId === link.id}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            >
              {unlinkingId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>

      {/* Add more catalog button / search */}
      {canAddMore && !showAddSearch && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShowAddSearch}
          className="w-full h-7 text-xs text-[#2563EB] hover:text-[#1d4ed8] hover:bg-blue-50 border border-dashed border-blue-200"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add another catalog
        </Button>
      )}

      {showAddSearch && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Add catalog:</span>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={handleCancelAdd}>
              <X className="h-3 w-3 mr-0.5" />Cancel
            </Button>
          </div>
          {renderSearchInput()}
        </div>
      )}

      {linking && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Applying catalog...
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) handleCancelConfirm(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Catalog?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will apply semantic labels, units, data types, and scales from the catalog to matching variables for equipment <span className="font-mono font-medium">{equipmentIp}</span>.
                </p>
                {pendingSelection && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium text-sm text-blue-900">
                          {pendingSelection.manufacturer} / {pendingSelection.model}
                        </div>
                        <div className="text-xs text-blue-700">
                          {pendingSelection.protocol} • {pendingSelection.registerCount} registers
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-sm text-amber-700">
                  Existing semantics on matched variables will be overwritten for matching registers.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLink} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link2 className="h-4 w-4 mr-2" />Apply Catalog
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};