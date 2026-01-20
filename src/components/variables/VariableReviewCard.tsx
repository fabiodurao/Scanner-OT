import { DiscoveredVariable } from "@/types/discovery";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle, Pencil, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type LearningState = "unknown" | "hypothesis" | "confirmed" | "published";

const stateConfig: Record<
  LearningState,
  { label: string; className: string }
> = {
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-700" },
  hypothesis: { label: "Hypothesis", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  published: { label: "Published", className: "bg-blue-100 text-blue-800" },
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
  const state = stateConfig[learningState] ?? stateConfig.unknown;

  const aiType = variable.ai_suggested_type ?? null;
  const aiConfidence = typeof variable.ai_confidence === "number" ? variable.ai_confidence : null;
  const aiConfidencePct = aiConfidence !== null ? Math.round(aiConfidence * 100) : null;

  const canConfirmAI = Boolean(aiType) && learningState !== "confirmed" && learningState !== "published";

  return (
    <Card
      className={cn(
        "border-slate-200 hover:shadow-md transition-shadow",
        learningState === "hypothesis" && "border-amber-200 bg-amber-50/30",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono font-medium truncate">{variable.source_ip}</div>
            <div className="text-xs text-muted-foreground">
              Addr <span className="font-mono">{variable.address}</span> • FC{" "}
              <span className="font-mono">{variable.function_code}</span>
              {typeof variable.sample_count === "number" && (
                <>
                  {" "}
                  • <span className="font-mono">{variable.sample_count}</span> samples
                </>
              )}
            </div>
          </div>

          <Badge className={state.className}>{state.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {(variable.semantic_label || variable.semantic_unit || variable.semantic_category) && (
          <div className="flex flex-wrap gap-2">
            {variable.semantic_label && <Badge variant="outline">{variable.semantic_label}</Badge>}
            {variable.semantic_unit && (
              <Badge variant="outline" className="font-mono">
                {variable.semantic_unit}
              </Badge>
            )}
            {variable.semantic_category && (
              <Badge variant="secondary">{variable.semantic_category}</Badge>
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Current type</div>
          <div className="flex items-center gap-2">
            {variable.data_type ? (
              <Badge variant="secondary" className="font-mono">
                {variable.data_type}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground italic">Not set</span>
            )}
          </div>
        </div>

        {aiType && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-900">
              <Sparkles className="h-4 w-4" />
              AI Suggestion
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <Badge className="bg-purple-100 text-purple-800 font-mono">{aiType}</Badge>

              {aiConfidencePct !== null && (
                <div className="flex items-center gap-2">
                  <Progress value={aiConfidencePct} className="h-2 w-20" />
                  <span className="text-xs font-medium text-purple-900">{aiConfidencePct}%</span>
                </div>
              )}
            </div>

            {variable.ai_reasoning && (
              <div className="mt-2 text-xs text-purple-800 line-clamp-3">
                {variable.ai_reasoning}
              </div>
            )}
          </div>
        )}

        {variable.last_seen_at && (
          <div className="text-xs text-muted-foreground">
            Last seen{" "}
            {formatDistanceToNow(new Date(variable.last_seen_at), { addSuffix: true })}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
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
              <CheckCircle className="h-4 w-4 mr-2" />
              {isConfirming ? "Confirming..." : "Confirm AI"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}