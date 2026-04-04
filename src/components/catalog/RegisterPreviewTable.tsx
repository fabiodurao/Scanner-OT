import { CatalogRegister } from '@/types/catalog';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface RegisterPreviewTableProps {
  registers: CatalogRegister[];
}

export const RegisterPreviewTable = ({ registers }: RegisterPreviewTableProps) => {
  if (registers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg border-dashed">
        No registers imported yet. Click "Edit Registers" to add them.
      </div>
    );
  }

  return (
    <div className="rounded-md border max-h-[500px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-slate-50 z-10">
          <TableRow>
            <TableHead className="w-20">Address</TableHead>
            <TableHead className="w-12">FC</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Label</TableHead>
            <TableHead className="w-24">Data Type</TableHead>
            <TableHead className="w-16">Scale</TableHead>
            <TableHead className="w-16">Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registers.map((reg, index) => (
            <TableRow key={`${reg.address}-${reg.function_code}-${index}`}>
              <TableCell className="font-mono font-medium">{reg.address}</TableCell>
              <TableCell className="font-mono">{reg.function_code}</TableCell>
              <TableCell className="font-mono text-xs">{reg.name}</TableCell>
              <TableCell className="text-sm">{reg.label || '—'}</TableCell>
              <TableCell>
                {reg.data_type ? (
                  <Badge variant="secondary" className="font-mono text-[10px]">{reg.data_type}</Badge>
                ) : '—'}
              </TableCell>
              <TableCell className="font-mono text-xs">{reg.scale !== 1 ? reg.scale : '1'}</TableCell>
              <TableCell>
                {reg.unit ? (
                  <Badge variant="outline" className="text-[10px]">{reg.unit}</Badge>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};