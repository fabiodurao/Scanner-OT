import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, RotateCcw, ChevronDown, Eye, Bot, Sparkles } from 'lucide-react';
import { PROMPT_FUNCTIONS, AIPrompts } from '@/hooks/useUserSettings';
import { REGISTER_CATEGORIES } from '@/types/catalog';

const EXAMPLE_REGISTERS = [
  { address: 40001, name: 'V_L1_N', label: 'Voltage L1-N', unit: 'V', data_type: 'float32be' },
  { address: 40003, name: 'I_L1', label: 'Current L1', unit: 'A', data_type: 'float32be' },
  { address: 40020, name: 'kWh_Total', label: 'Total Energy', unit: 'kWh', data_type: 'uint32be' },
];

interface AIPromptsSettingsProps {
  prompts: AIPrompts;
  onPromptChange: (key: keyof AIPrompts, value: string) => void;
}

export const AIPromptsSettings = ({ prompts, onPromptChange }: AIPromptsSettingsProps) => {
  const [previewOpen, setPreviewOpen] = useState<Record<string, boolean>>({});

  const togglePreview = (key: string) => {
    setPreviewOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const buildPreview = (prompt: string) => {
    const categoriesJson = JSON.stringify(
      REGISTER_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
      null,
      2
    );
    const registersJson = JSON.stringify(EXAMPLE_REGISTERS, null, 2);
    return prompt
      .replace('{{categories_json}}', categoriesJson)
      .replace('{{registers_json}}', registersJson);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Prompts
        </CardTitle>
        <CardDescription>
          Customize the prompts used for AI-powered features across the system. Each function has its own editable prompt template.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {PROMPT_FUNCTIONS.map((fn) => {
            const currentPrompt = prompts[fn.key] || fn.defaultPrompt;
            const isDefault = currentPrompt === fn.defaultPrompt;
            const isPreviewOpen = previewOpen[fn.key] || false;

            return (
              <AccordionItem key={fn.key} value={fn.key} className="border rounded-lg mb-2 last:mb-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-1.5 rounded-lg bg-violet-100 flex-shrink-0">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{fn.label}</span>
                        {!isDefault && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 px-1.5 py-0 h-4">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fn.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground">{fn.description}</p>

                    {/* Prompt editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Prompt Template</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPromptChange(fn.key, fn.defaultPrompt)}
                          disabled={isDefault}
                          className="h-7 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset to Default
                        </Button>
                      </div>
                      <Textarea
                        value={currentPrompt}
                        onChange={e => onPromptChange(fn.key, e.target.value)}
                        className="font-mono text-xs min-h-[180px] resize-y"
                        placeholder="Enter your prompt template..."
                      />
                    </div>

                    {/* Variables */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Available Variables</span>
                      <div className="flex flex-wrap gap-2">
                        {fn.variables.map(v => (
                          <div key={v.name} className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-[10px] cursor-help" title={v.description}>
                              {v.name}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{v.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <Collapsible open={isPreviewOpen} onOpenChange={() => togglePreview(fn.key)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-between">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Preview with example data
                          </span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${isPreviewOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 p-3 bg-slate-50 rounded-md border max-h-[300px] overflow-auto">
                          <pre className="text-[10px] font-mono whitespace-pre-wrap text-slate-700">
                            {buildPreview(currentPrompt)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {PROMPT_FUNCTIONS.length === 1 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            More AI prompt functions will be added as new features are developed.
          </div>
        )}
      </CardContent>
    </Card>
  );
};