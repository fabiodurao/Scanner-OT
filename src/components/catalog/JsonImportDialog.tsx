import { useState } from 'react';
import { CatalogRegister } from '@/types/catalog';
import { JsonFormatHelp } from './JsonFormatHelp';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, FileJson } from 'lucide-react';

interface JsonImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (registers: CatalogRegister[]) => void;
  isImporting?: boolean;
  title?: string;
}

export const JsonImportDialog = ({
  open, onOpenChange, onImport, isImporting = false, title = 'Import Registers (JSON)',
}: JsonImportDialogProps) => {
  const [jsonText, setJsonText] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    registers?: CatalogRegister[];
    error?: string;
  } | null>(null);

  const handleClose = () => {
    setJsonText('');
    setValidationResult(null);
    onOpenChange(false);
  };

  const validateJson = () => {
    if (!jsonText.trim()) {
      setValidationResult({ valid: false, error: 'JSON input is empty.' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      const msg = e instanceof SyntaxError ? e.message : 'Invalid JSON syntax.';
      setValidationResult({ valid: false, error: `JSON parse error: ${msg}` });
      return;
    }

    if (!Array.isArray(parsed)) {
      setValidationResult({ valid: false, error: 'JSON must be an array of register objects.' });
      return;
    }

    if (parsed.length === 0) {
      setValidationResult({ valid: false, error: 'Array is empty. Add at least one register.' });
      return;
    }

    const errors: string[] = [];
    const registers: CatalogRegister[] = [];

    parsed.forEach((item: unknown, index: number) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`Item [${index}]: Must be an object.`);
        return;
      }

      const obj = item as Record<string, unknown>;

      if (typeof obj.address !== 'number') {
        errors.push(`Item [${index}]: "address" must be a number.`);
      }
      if (typeof obj.name !== 'string' || !obj.name.trim()) {
        errors.push(`Item [${index}]: "name" must be a non-empty string.`);
      }
      if (typeof obj.function_code !== 'number') {
        errors.push(`Item [${index}]: "function_code" must be a number.`);
      }

      if (errors.length > 5) return; // Stop after 5 errors

      registers.push({
        address: obj.address as number,
        name: (obj.name as string || '').trim(),
        label: (obj.label as string || obj.name as string || '').trim(),
        data_type: (obj.data_type as string || '').trim().toLowerCase(),
        scale: typeof obj.scale === 'number' ? obj.scale : 1,
        unit: (obj.unit as string || '').trim(),
        function_code: obj.function_code as number,
        description: (obj.description as string || '').trim(),
      });
    });

    if (errors.length > 0) {
      setValidationResult({
        valid: false,
        error: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''),
      });
      return;
    }

    setValidationResult({ valid: true, registers });
  };

  const handleImport = () => {
    if (validationResult?.valid && validationResult.registers) {
      onImport(validationResult.registers);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-[#2563EB]" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Paste a JSON array of register definitions below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <JsonFormatHelp />

          <Textarea
            placeholder='[\n  {\n    "address": 40001,\n    "name": "V_L1_N",\n    "label": "Voltage L1-N",\n    "data_type": "float32be",\n    "scale": 1,\n    "unit": "V",\n    "function_code": 3\n  }\n]'
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidationResult(null);
            }}
            className="font-mono text-xs min-h-[250px] resize-y"
          />

          {validationResult && (
            validationResult.valid ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  <span className="font-medium">Valid!</span> Found{' '}
                  <Badge variant="secondary" className="mx-1">{validationResult.registers?.length}</Badge>
                  registers ready to import.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <pre className="whitespace-pre-wrap text-xs mt-1 font-mono">{validationResult.error}</pre>
                </AlertDescription>
              </Alert>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {!validationResult?.valid && (
            <Button variant="outline" onClick={validateJson} disabled={!jsonText.trim()}>
              Validate
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={!validationResult?.valid || isImporting}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {isImporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
            ) : (
              <>Import {validationResult?.registers?.length || 0} Registers</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};