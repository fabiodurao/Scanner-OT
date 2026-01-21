import { DiscoveredVariable } from "@/types/discovery";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CheckCircle, Pencil, Sparkles, HelpCircle, Lightbulb, Upload, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type LearningState = "unknown" | "hypothesis" | "confirmed" | "published";

const stateConfig: Record<LearningState, { label: string; className: string; icon: React.ElementType }> = {
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-700", icon: HelpCircle },
  hypothesis: { label: "Hypothesis", className: "bg-amber-100 text-amber-800", icon: Lightbulb },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  published: { label: "Published", className: "bg-blue-100 text-blue-800", icon: Upload },
};

export function VariableReviewCard({
  variable,
  onConfirmAI,
  onEdit,
  isConfirming = false,
}: {
  variable: DiscoveredVariable;
  onConfirmAI: () => void;
  onEdit: () => void;
  isConfirming?: boolean;
}) {
  const learningState = (variable.learning_state || "unknown") as LearningState;
  const state = stateConfig[learningState];
  const StateIcon = state.icon;

  const aiType = variable.ai_suggested_type ?? null;
  const aiConfidence = typeof variable.ai_confidence === "number" ? variable.ai_confidence : null;
  const aiConfidencePct = aiConfidence !== null ? Math.round(aiConfidence * 100) : null;

  const canConfirmAI = Boolean(aiType) && learningState !== "confirmed" && learningState !== "published";

  // Get winner from historical analysis
  const winner = variable.winner;
  const hasHistoricalData = winner !== null;

  return (
    <Card
      className={cn(
        "border-slate-200 hover:shadow-lg transition-all duration-200",
        learningState === "hypothesis" && "border-amber-300 bg-amber-50/20",
        canConfirmAI && "border-purple-300 bg-purple-50/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-base">{variable.source_ip}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {variable.address}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>FC {variable.function_code}</span>
              {variable.unit_id !== null && <span>• Unit {variable.unit_id}</span>}
              {typeof variable.sample_count === "number" && (
                <span>• {variable.sample_count} samples</span>
              )}
            </div>
          </div>

          <Badge className={state.className}>
            <StateIcon className="h-3 w-3 mr-1" />
            {state.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current configuration */}
        {(variable.semantic_label || variable.data_type) && (
          <div className="space-y-2">
            {variable.semantic_label && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Label</div>
                <Badge variant="outline" className="font-medium">{variable.semantic_label}</Badge>
                {variable.semantic_unit && (
                  <Badge variant="outline" className="ml-2 font-mono text-xs">
                    {variable.semantic_unit}
                  </Badge>
                )}
              </div>
            )}
            
            {variable.data_type && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current Type</div>
                <Badge variant="secondary" className="font-mono">
                  {variable.data_type}
                </Badge>
                {variable.confidence_score > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {Math.round(variable.confidence_score * 100)}% confidence
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Suggestion */}
        {aiType && (
          <>
            {(variable.semantic_label || variable.data_type) && <Separator />}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-900 mb-2">
                <Sparkles className="h-4 w-4" />
                AI Suggestion
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Badge className="bg-purple-600 text-white font-mono text-sm px-2 py-1">
                    {aiType}
                  </Badge>

                  {aiConfidencePct !== null && (
                    <div className="flex items-center gap-2">
                      <Progress value={aiConfidencePct} className="h-2 w-20" />
                      <span className="text-sm font-bold text-purple-900 w-10 text-right">
                        {aiConfidencePct}%
                      </span>
                    </div>
                  )}
                </div>

                {variable.ai_reasoning && (
                  <div className="text-xs text-purple-800 leading-relaxed line-clamp-3">
                    {variable.ai_reasoning}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Historical Winner */}
        {hasHistoricalData && winner && (
          <>
            <Separator />
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-2">
                <TrendingUp className="h-4 w-4" />
                Historical Analysis Winner
              </div>
              <Badge className="bg-blue-600 text-white font-mono text-sm px-2 py-1">
                {winner}
              </Badge>
              {variable.explanation && (
                <div className="text-xs text-blue-800 leading-relaxed mt-2 line-clamp-2">
                  {variable.explanation}
                </div>
              )}
            </div>
          </>
        )}

        {/* Metadata */}
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {variable.last_seen_at && (
            <span>
              Last seen {formatDistanceToNow(new Date(variable.last_seen_at), { addSuffix: true })}
            </span>
          )}
          {variable.protocol && (
            <Badge variant="secondary" className="text-[10px]">{variable.protocol}</Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>

          {canConfirmAI && (
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={onConfirmAI}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm AI
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}