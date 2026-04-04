import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, RotateCcw, ChevronDown, Eye } from 'lucide-react';
import { DEFAULT_CATEGORIZE_PROMPT } from '@/hooks/useUserSettings';
import { REGISTER_CATEGORIES } from '@/types/catalog';

const AVAILABLE_VARIABLES = [
  { name: '{{categories_json}}', description: 'JSON array of available categories' },
  { name: '{{registers_json}}', description: 'JSON array of registers to classify' },
];

const EXAMPLE_REGISTERS = [
  { address: 40001, name: 'V_L1_N', label: 'Voltage L1-N', unit: 'V', data_type: 'float32be' },
  { address: 40003, name: 'I_L1', label: 'Current L1', unit: 'A', data_type: 'float32be' },
  { address: 40020, name: 'kWh_Total', label: 'Total Energy', unit: 'kWh', data_type: 'uint32be' },
];

interface AIPromptsSettingsProps {
  prompt: string;
  onPromptChange: (value: string) => void;
}

export const AIPromptsSettings = ({ prompt, onPromptChange }: AIPromptsSettingsProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleReset = () => {
    onPromptChange(DEFAULT_CATEGORIZE_PROMPT);
  };

  const isDefault = prompt === DEFAULT_CATEGORIZE_PROMPT;

  // Build preview
  const categoriesJson = JSON.stringify(
    REGISTER_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
    null,
    2
  );
  const registersJson = JSON.stringify(EXAMPLE_REGISTERS, null, 2);
  const previewText = prompt
    .replace('{{categories_json}}', categoriesJson)
    .replace('{{registers_json}}', registersJson);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Prompts
        </CardTitle>
        <CardDescription>
          Customize the prompts used for AI-powered features. Use variables to inject dynamic data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Register Categorization Prompt</Label>
            <div className="flex items-center gap-2">
              {!isDefault && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                  Modified
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isDefault}
                className="h-7 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset to Default
              </Button>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            className="font-mono text-xs min-h-[200px] resize-y"
            placeholder="Enter your categorization prompt..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Available Variables</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map(v => (
              <div key={v.name} className="flex items-center gap-1.5">
                <Badge variant="secondary" className="font-mono text-[10px] cursor-help" title={v.description}>
                  {v.name}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{v.description}</span>
              </div>
            ))}
          </div>
        </div>

        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-between">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Preview with example data
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-slate-50 rounded-md border max-h-[300px] overflow-auto">
              <pre className="text-[10px] font-mono whitespace-pre-wrap text-slate-700">
                {previewText}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
