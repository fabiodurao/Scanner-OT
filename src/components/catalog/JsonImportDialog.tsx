import { useState, useEffect } from 'react';
import { CatalogRegister } from '@/types/catalog';
import { JsonFormatHelp } from './JsonFormatHelp';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Loader2, FileJson, Bot } from 'lucide-react';
import { useAIService } from '@/hooks/useAIService';
import { useUserSettings } from '@/hooks/useUserSettings';

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
  const [autoCategorize, setAutoCategorize] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizedRegisters, setCategorizedRegisters] = useState<CatalogRegister[] | null>(null);
  const [categorizedCount, setCategorizedCount] = useState(0);

  const { categorizeRegisters, progress: aiProgress } = useAIService();
  const { settings } = useUserSettings();

  const hasApiKey = Boolean(settings.ai_api_key);

  // Reset auto-categorize default when dialog opens
  useEffect(() => {
    if (open) {
      setAutoCategorize(hasApiKey);
    }
  }, [open, hasApiKey]);

  const handleClose = () => {
    setJsonText('');
    setValidationResult(null);
    setCategorizedRegisters(null);
    setCategorizedCount(0);
    setCategorizing(false);
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

      if (errors.length > 5) return;

      registers.push({
        address: obj.address as number,
        name: (obj.name as string || '').trim(),
        label: (obj.label as string || obj.name as string || '').trim(),
        data_type: (obj.data_type as string || '').trim().toLowerCase(),
        scale: typeof obj.scale === 'number' ? obj.scale : 1,
        unit: (obj.unit as string || '').trim(),
        function_code: obj.function_code as number,
        category: (obj.category as string || '').trim() || undefined,
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
    setCategorizedRegisters(null);
    setCategorizedCount(0);
  };

  const handleRunAICategorize = async () => {
    if (!validationResult?.registers) return;

    setCategorizing(true);
    try {
      const uncategorized = validationResult.registers.filter(r => !r.category);
      const toProcess = uncategorized.length > 0 ? uncategorized : validationResult.registers;

      const results = await categorizeRegisters(toProcess);
      const resultMap = new Map(results.map(r => [r.address, r.category]));

      const updated = validationResult.registers.map(reg => {
        const newCategory = resultMap.get(reg.address);
        if (newCategory) return { ...reg, category: newCategory };
        return reg;
      });

      setCategorizedRegisters(updated);
      setCategorizedCount(results.length);
    } catch (err) {
      console.error('AI categorization failed:', err);
    }
    setCategorizing(false);
  };

  const handleImport = () => {
    const registersToImport = categorizedRegisters || validationResult?.registers;
    if (registersToImport) {
      onImport(registersToImport);
    }
  };

  const registersToShow = categorizedRegisters || validationResult?.registers;
  const uncategorizedCount = registersToShow?.filter(r => !r.category).length || 0;

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
            placeholder='[\n  {\n    "address": 40001,\n    "name": "V_L1_N",\n    "label": "Voltage L1-N",\n    "data_type": "float32be",\n    "scale": 1,\n    "unit": "V",\n    "function_code": 3,\n    "category": "instantaneous_electrical"\n  }\n]'
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidationResult(null);
              setCategorizedRegisters(null);
              setCategorizedCount(0);
            }}
            className="font-mono text-xs min-h-[250px] resize-y"
          />

          {validationResult && (
            validationResult.valid ? (
              <div className="space-y-3">
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    <span className="font-medium">Valid!</span> Found{' '}
                    <Badge variant="secondary" className="mx-1">{validationResult.registers?.length}</Badge>
                    registers ready to import.
                    {uncategorizedCount > 0 && (
                      <span className="text-emerald-600 ml-1">
                        ({uncategorizedCount} without category)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                {hasApiKey && uncategorizedCount > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-violet-200 bg-violet-50/50">
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        id="auto-categorize"
                        checked={autoCategorize}
                        onCheckedChange={(checked) => setAutoCategorize(checked === true)}
                      />
                      <Label htmlFor="auto-categorize" className="text-sm flex items-center gap-1.5 cursor-pointer">
                        <Bot className="h-4 w-4 text-violet-600" />
                        Auto-categorize with AI before importing
                      </Label>
                    </div>
                    {autoCategorize && !categorizedRegisters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunAICategorize}
                        disabled={categorizing}
                        className="text-violet-600 border-violet-200 hover:bg-violet-100"
                      >
                        {categorizing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            {aiProgress ? `${aiProgress.current}/${aiProgress.total}` : 'Processing...'}
                          </>
                        ) : (
                          <><Bot className="h-3.5 w-3.5 mr-1" />Run AI</>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {categorizedRegisters && categorizedCount > 0 && (
                  <Alert className="border-violet-200 bg-violet-50">
                    <Bot className="h-4 w-4 text-violet-600" />
                    <AlertDescription className="text-violet-800">
                      AI categorized <Badge variant="secondary" className="mx-1">{categorizedCount}</Badge> registers.
                      {uncategorizedCount > 0 && ` ${uncategorizedCount} still uncategorized.`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
            disabled={!validationResult?.valid || isImporting || categorizing}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {isImporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
            ) : (
              <>Import {registersToShow?.length || 0} Registers</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
