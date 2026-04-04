import { useState, useEffect } from 'react';
import { EquipmentCatalog } from '@/types/catalog';
import { useCatalogEntities } from '@/hooks/useCatalogEntities';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Factory, Box, Network } from 'lucide-react';

interface CatalogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog?: EquipmentCatalog | null;
  onSave: (data: {
    manufacturer: string;
    model: string;
    description?: string;
    manufacturer_id: string;
    model_id: string;
    protocol_name: string;
    protocol_id: string;
  }) => Promise<void>;
  saving?: boolean;
}

export const CatalogForm = ({ open, onOpenChange, catalog, onSave, saving = false }: CatalogFormProps) => {
  const { manufacturers, models, protocols, loading, getModelsForManufacturer, fetchAll } = useCatalogEntities();

  const [manufacturerId, setManufacturerId] = useState('');
  const [modelId, setModelId] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [description, setDescription] = useState('');

  const availableModels = manufacturerId ? getModelsForManufacturer(manufacturerId) : [];

  // Refresh entity data every time the dialog opens
  useEffect(() => {
    if (open) {
      fetchAll();
    }
  }, [open, fetchAll]);

  useEffect(() => {
    if (open) {
      if (catalog) {
        setManufacturerId(catalog.manufacturer_id || '');
        setModelId(catalog.model_id || '');
        setDescription(catalog.description || '');
        // Set protocol from existing catalog protocol
        const existingProto = catalog.protocols?.[0];
        setProtocolId(existingProto?.protocol_id || '');
      } else {
        setManufacturerId('');
        setModelId('');
        setProtocolId('');
        setDescription('');
      }
    }
  }, [catalog, open]);

  // Reset model when manufacturer changes
  useEffect(() => {
    if (!catalog) setModelId('');
  }, [manufacturerId, catalog]);

  const selectedMfg = manufacturers.find(m => m.id === manufacturerId);
  const selectedModel = models.find(m => m.id === modelId);
  const selectedProto = protocols.find(p => p.id === protocolId);

  const isEditing = !!catalog;
  const canSubmit = isEditing
    ? manufacturerId && modelId
    : manufacturerId && modelId && protocolId;

  const handleSubmit = async () => {
    if (!selectedMfg || !selectedModel) return;
    await onSave({
      manufacturer: selectedMfg.name,
      model: selectedModel.name,
      description: description || undefined,
      manufacturer_id: manufacturerId,
      model_id: modelId,
      protocol_name: selectedProto?.name || '',
      protocol_id: protocolId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Catalog' : 'New Equipment Catalog'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update catalog information.'
              : 'Select manufacturer, model, and protocol to create a new catalog entry.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Manufacturer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Factory className="h-4 w-4 text-muted-foreground" />
                Manufacturer *
              </Label>
              <Select value={manufacturerId} onValueChange={setManufacturerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer..." />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                  {manufacturers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No manufacturers registered. Add them in Reference Data.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Box className="h-4 w-4 text-muted-foreground" />
                Model *
              </Label>
              <Select value={modelId} onValueChange={setModelId} disabled={!manufacturerId}>
                <SelectTrigger>
                  <SelectValue placeholder={manufacturerId ? 'Select model...' : 'Select manufacturer first'} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                  {manufacturerId && availableModels.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No models for this manufacturer. Add them in Reference Data.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Protocol */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Network className="h-4 w-4 text-muted-foreground" />
                Protocol {!isEditing && '*'}
              </Label>
              <Select value={protocolId} onValueChange={setProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol..." />
                </SelectTrigger>
                <SelectContent>
                  {protocols.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <span className="font-mono">{p.name}</span>
                        {p.description && <span className="text-muted-foreground ml-2 text-xs">— {p.description}</span>}
                      </div>
                    </SelectItem>
                  ))}
                  {protocols.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No protocols registered. Add them in Reference Data.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Optional notes about this catalog entry..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving || loading}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : isEditing ? 'Save Changes' : 'Create Catalog'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};