import { useEffect, useMemo, useState } from "react";
import { DiscoveredVariable } from "@/types/discovery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DATA_TYPES = [
  "uint16",
  "int16",
  "uint32be",
  "int32be",
  "uint32le",
  "int32le",
  "float32be",
  "float32le",
  "uint64be",
  "int64be",
  "uint64le",
  "int64le",
  "float64be",
  "float64le",
] as const;

export function VariableEditDialog({
  open,
  onOpenChange,
  variable,
  onSave,
  isSaving = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: DiscoveredVariable | null;
  onSave: (data: {
    data_type: string;
    semantic_label: string | null;
    semantic_unit: string | null;
    semantic_category: string | null;
  }) => void;
  isSaving?: boolean;
}) {
  const [dataType, setDataType] = useState("");
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");

  const suggestedType = useMemo(() => variable?.ai_suggested_type ?? "", [variable]);

  useEffect(() => {
    if (!variable) return;
    setDataType(variable.data_type || variable.ai_suggested_type || "");
    setLabel(variable.semantic_label || "");
    setUnit(variable.semantic_unit || "");
    setCategory(variable.semantic_category || "");
  }, [variable]);

  if (!variable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit variable</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{variable.source_ip}</span> • Addr{" "}
            <span className="font-mono">{variable.address}</span> • FC{" "}
            <span className="font-mono">{variable.function_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {suggestedType && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="text-sm font-medium text-purple-900">AI suggestion</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 font-mono">{suggestedType}</Badge>
                {typeof variable.ai_confidence === "number" && (
                  <span className="text-xs text-purple-800">
                    {Math.round(variable.ai_confidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data type *</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type..." />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="font-mono">{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Active Power" />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. kW, V, A" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Power" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                data_type: dataType,
                semantic_label: label.trim() ? label.trim() : null,
                semantic_unit: unit.trim() ? unit.trim() : null,
                semantic_category: category.trim() ? category.trim() : null,
              })
            }
            disabled={!dataType || isSaving}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {isSaving ? "Saving..." : "Save & Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}