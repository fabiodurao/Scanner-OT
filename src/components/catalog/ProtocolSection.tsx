import { useState } from 'react';
import { CatalogProtocol, CatalogRegister } from '@/types/catalog';
import { RegisterPreviewTable } from './RegisterPreviewTable';
import { JsonImportDialog } from './JsonImportDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, FileJson, Trash2, Network, Loader2 } from 'lucide-react';

interface ProtocolSectionProps {
  protocols: CatalogProtocol[];
  onAddProtocol: (protocol: string, registers: CatalogRegister[]) => Promise<void>;
  onUpdateProtocol: (protocolId: string, registers: CatalogRegister[]) => Promise<void>;
  onDeleteProtocol: (protocolId: string) => Promise<void>;
}

export const ProtocolSection = ({
  protocols, onAddProtocol, onUpdateProtocol, onDeleteProtocol,
}: ProtocolSectionProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState('');
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [reimportProtocolId, setReimportProtocolId] = useState<string | null>(null);
  const [pendingProtocolName, setPendingProtocolName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isReimporting, setIsReimporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartAdd = () => {
    setNewProtocolName('');
    setAddDialogOpen(true);
  };

  const handleProceedToJson = () => {
    if (!newProtocolName.trim()) return;
    setPendingProtocolName(newProtocolName.trim());
    setAddDialogOpen(false);
    setJsonImportOpen(true);
  };

  const handleImportNew = async (registers: CatalogRegister[]) => {
    setIsAdding(true);
    await onAddProtocol(pendingProtocolName, registers);
    setIsAdding(false);
    setJsonImportOpen(false);
  };

  const handleReimport = async (registers: CatalogRegister[]) => {
    if (!reimportProtocolId) return;
    setIsReimporting(true);
    await onUpdateProtocol(reimportProtocolId, registers);
    setIsReimporting(false);
    setReimportProtocolId(null);
  };

  const handleDelete = async (protocolId: string) => {
    setDeletingId(protocolId);
    await onDeleteProtocol(protocolId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Protocol Definitions</h3>
        <Button onClick={handleStartAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />Add Protocol
        </Button>
      </div>

      {protocols.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <Network className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No protocols defined yet.</p>
          <p className="text-sm mt-1">Add a protocol with its register map.</p>
        </div>
      ) : (
        <Accordion type="single" collapsible>
          {protocols.map((protocol) => (
            <AccordionItem key={protocol.id} value={protocol.id} className="border rounded-lg mb-2">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Network className="h-4 w-4 text-[#2563EB]" />
                    <Badge variant="secondary" className="font-mono">{protocol.protocol}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {protocol.register_count} register{protocol.register_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Register Map</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReimportProtocolId(protocol.id)}
                      >
                        <FileJson className="h-4 w-4 mr-2" />Re-import JSON
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingId === protocol.id}
                          >
                            {deletingId === protocol.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete protocol?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the "{protocol.protocol}" protocol and all its {protocol.register_count} registers. Equipment linked to this protocol will be unlinked.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(protocol.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <RegisterPreviewTable registers={protocol.registers || []} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Add Protocol Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Protocol</DialogTitle>
            <DialogDescription>Enter the protocol name, then import its register map.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Protocol Name *</Label>
              <Input
                placeholder="e.g., modbus_tcp, modbus_rtu, dnp3"
                value={newProtocolName}
                onChange={(e) => setNewProtocolName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleProceedToJson}
              disabled={!newProtocolName.trim()}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              <FileJson className="h-4 w-4 mr-2" />Next: Import Registers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import for new protocol */}
      <JsonImportDialog
        open={jsonImportOpen}
        onOpenChange={setJsonImportOpen}
        onImport={handleImportNew}
        isImporting={isAdding}
        title={`Import Registers for "${pendingProtocolName}"`}
      />

      {/* JSON Re-import for existing protocol */}
      <JsonImportDialog
        open={!!reimportProtocolId}
        onOpenChange={(open) => !open && setReimportProtocolId(null)}
        onImport={handleReimport}
        isImporting={isReimporting}
        title="Re-import Registers"
      />
    </div>
  );
};