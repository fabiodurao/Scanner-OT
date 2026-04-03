import { useState, useEffect } from 'react';
import { EquipmentCatalog } from '@/types/catalog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface CatalogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog?: EquipmentCatalog | null;
  onSave: (data: { manufacturer: string; model: string; description?: string }) => Promise<void>;
  saving?: boolean;
}

export const CatalogForm = ({ open, onOpenChange, catalog, onSave, saving = false }: CatalogFormProps) => {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (catalog) {
      setManufacturer(catalog.manufacturer);
      setModel(catalog.model);
      setDescription(catalog.description || '');
    } else {
      setManufacturer('');
      setModel('');
      setDescription('');
    }
  }, [catalog, open]);

  const handleSubmit = async () => {
    if (!manufacturer.trim() || !model.trim()) return;
    await onSave({ manufacturer, model, description: description || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{catalog ? 'Edit Catalog' : 'New Equipment Catalog'}</DialogTitle>
          <DialogDescription>
            {catalog ? 'Update catalog information.' : 'Create a new equipment catalog with manufacturer and model.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer *</Label>
            <Input
              id="manufacturer"
              placeholder="e.g., Schneider Electric"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              placeholder="e.g., PM5560"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!manufacturer.trim() || !model.trim() || saving}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : catalog ? 'Save Changes' : 'Create Catalog'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};