import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Info, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const exampleJson = `[
  {
    "address": 40001,
    "name": "V_L1_N",
    "label": "Voltage L1-N",
    "data_type": "float32be",
    "scale": 1,
    "unit": "V",
    "function_code": 3,
    "category": "instantaneous_electrical",
    "description": "Phase L1 to Neutral voltage"
  },
  {
    "address": 40003,
    "name": "V_L2_N",
    "label": "Voltage L2-N",
    "data_type": "float32be",
    "scale": 1,
    "unit": "V",
    "function_code": 3,
    "category": "instantaneous_electrical"
  },
  {
    "address": 40013,
    "name": "P_TOTAL",
    "label": "Total Active Power",
    "data_type": "float32be",
    "scale": 0.001,
    "unit": "kW",
    "function_code": 3,
    "category": "instantaneous_electrical"
  }
]`;

export const JsonFormatHelp = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleJson);
    setCopied(true);
    toast.success('JSON template copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2">
          <Info className="h-3 w-3" />
          Expected JSON Format
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-slate-50 rounded-lg border text-xs space-y-2">
          <p className="text-muted-foreground">
            Paste a JSON array of register objects. Required fields: <code className="bg-white px-1 rounded">address</code>, <code className="bg-white px-1 rounded">name</code>, <code className="bg-white px-1 rounded">function_code</code>.
          </p>
          <div className="space-y-1">
            <p className="font-medium text-slate-700">Fields:</p>
            <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li><code>address</code> (number, required) — Register address</li>
              <li><code>name</code> (string, required) — Internal register name</li>
              <li><code>label</code> (string) — Human-readable label</li>
              <li><code>data_type</code> (string) — e.g., float32be, uint16, int32le</li>
              <li><code>scale</code> (number) — Scaling factor (default: 1)</li>
              <li><code>unit</code> (string) — Engineering unit (e.g., V, kW, °C)</li>
              <li><code>function_code</code> (number, required) — Modbus function code (e.g., 3 = holding, 4 = input)</li>
              <li><code>category</code> (string) — Register category (e.g., instantaneous_electrical, demand, energy_accumulators)</li>
              <li><code>description</code> (string) — Optional description</li>
            </ul>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-700">Example:</p>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy Template'}
              </Button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
              {exampleJson}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};