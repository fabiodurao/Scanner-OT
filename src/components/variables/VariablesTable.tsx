import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Variable, Equipment } from '@/types';
import { LearningStateBadge } from './LearningStateBadge';
import { Progress } from '@/components/ui/progress';

interface VariablesTableProps {
  variables: Variable[];
  equipment?: Equipment[];
  showEquipment?: boolean;
}

export const VariablesTable = ({ variables, equipment = [], showEquipment = false }: VariablesTableProps) => {
  const getEquipmentName = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq?.name || equipmentId;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showEquipment && <TableHead>Equipment</TableHead>}
            <TableHead>Address</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Semantic Hypothesis</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variables.map((variable) => (
            <TableRow key={variable.id}>
              {showEquipment && (
                <TableCell className="font-medium">
                  {getEquipmentName(variable.equipment_id)}
                </TableCell>
              )}
              <TableCell className="font-mono">{variable.register_address}</TableCell>
              <TableCell className="font-mono">
                {typeof variable.raw_value === 'number' 
                  ? variable.raw_value.toLocaleString('en-US')
                  : variable.raw_value}
                {variable.unit && <span className="text-muted-foreground ml-1">{variable.unit}</span>}
              </TableCell>
              <TableCell>
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                  {variable.data_type}
                </code>
              </TableCell>
              <TableCell>
                {variable.semantic_hypothesis || (
                  <span className="text-muted-foreground italic">Not identified</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={variable.confidence_score * 100} className="w-16 h-2" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(variable.confidence_score * 100)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <LearningStateBadge state={variable.learning_state} />
              </TableCell>
            </TableRow>
          ))}
          {variables.length === 0 && (
            <TableRow>
              <TableCell colSpan={showEquipment ? 7 : 6} className="text-center py-8 text-muted-foreground">
                No variables found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};