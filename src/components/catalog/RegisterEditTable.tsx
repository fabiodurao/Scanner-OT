import { useState } from 'react';
import { CatalogRegister, REGISTER_CATEGORIES } from '@/types/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, X } from 'lucide-react';

interface RegisterEditTableProps {
  registers: CatalogRegister[];
  onSave: (registers: CatalogRegister[]) => void;
  saving?: boolean;
}

const DATA_TYPES = [
  'boolean',
  'uint16', 'int16',
  'uint32be', 'uint32le', 'int32be', 'int32le',
  'float32be', 'float32le',
  'uint64be', 'uint64le', 'int64be', 'int64le',
  'float64be', 'float64le',
];

const emptyRegister: CatalogRegister = {
  address: 0, name: '', label: '', data_type: '', scale: 1, unit: '', function_code: 3, category: '',
};

export const RegisterEditTable = ({ registers, onSave, saving = false }: RegisterEditTableProps) => {
  const [rows, setRows] = useState<CatalogRegister[]>(registers);
  const [hasChanges, setHasChanges] = useState(false);

  const updateRow = (index: number, field: keyof CatalogRegister, value: string | number) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setHasChanges(true);
  };

  const addRow = () => {
    const lastAddr = rows.length > 0 ? rows[rows.length - 1].address + 1 : 40001;
    const lastFc = rows.length > 0 ? rows[rows.length - 1].function_code : 3;
    const lastCat = rows.length > 0 ? rows[rows.length - 1].category || '' : '';
    setRows(prev => [...prev, { ...emptyRegister, address: lastAddr, function_code: lastFc, category: lastCat }]);
    setHasChanges(true);
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    const valid = rows.filter(r => r.address > 0 && r.name.trim());
    onSave(valid);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setRows(registers);
    setHasChanges(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{rows.length} register{rows.length !== 1 ? 's' : ''}</span>
          {hasChanges && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Unsaved changes</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Row
          </Button>
          {hasChanges && (
            <>
              <Button size="sm" variant="ghost" onClick={handleDiscard}>
                <X className="h-3.5 w-3.5 mr-1" />Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50 z-10">
            <TableRow>
              <TableHead className="w-28 min-w-[112px]">Address</TableHead>
              <TableHead className="w-16">FC</TableHead>
              <TableHead className="min-w-[120px]">Name</TableHead>
              <TableHead className="min-w-[120px]">Label</TableHead>
              <TableHead className="w-48 min-w-[192px]">Category</TableHead>
              <TableHead className="w-36 min-w-[144px]">Data Type</TableHead>
              <TableHead className="w-20">Scale</TableHead>
              <TableHead className="w-20">Unit</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                  No registers. Click "Add Row" or import via JSON.
                </TableCell>
              </TableRow>
            ) : rows.map((reg, i) => (
              <TableRow key={i}>
                <TableCell className="p-1">
                  <Input type="number" value={reg.address} onChange={e => updateRow(i, 'address', parseInt(e.target.value) || 0)} className="h-7 text-xs font-mono w-full min-w-[90px]" />
                </TableCell>
                <TableCell className="p-1">
                  <Input type="number" value={reg.function_code} onChange={e => updateRow(i, 'function_code', parseInt(e.target.value) || 3)} className="h-7 text-xs font-mono w-full" />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={reg.name} onChange={e => updateRow(i, 'name', e.target.value)} className="h-7 text-xs font-mono w-full" placeholder="REG_NAME" />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={reg.label} onChange={e => updateRow(i, 'label', e.target.value)} className="h-7 text-xs w-full" placeholder="Human label" />
                </TableCell>
                <TableCell className="p-1">
                  <Select value={reg.category || '__none__'} onValueChange={v => updateRow(i, 'category', v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-7 text-[10px] w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>
                      {REGISTER_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="text-xs">{cat.emoji} {cat.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Select value={reg.data_type || '__none__'} onValueChange={v => updateRow(i, 'data_type', v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-7 text-xs font-mono w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>
                      {DATA_TYPES.map(dt => (
                        <SelectItem key={dt} value={dt}>
                          <span className="font-mono text-xs">{dt}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Input type="number" step="any" value={reg.scale} onChange={e => updateRow(i, 'scale', parseFloat(e.target.value) || 1)} className="h-7 text-xs font-mono w-full" />
                </TableCell>
                <TableCell className="p-1">
                  <Input value={reg.unit} onChange={e => updateRow(i, 'unit', e.target.value)} className="h-7 text-xs w-full" placeholder="kW" />
                </TableCell>
                <TableCell className="p-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
