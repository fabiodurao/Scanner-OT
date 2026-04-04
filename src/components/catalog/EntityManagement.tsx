import { useState } from 'react';
import { useCatalogEntities } from '@/hooks/useCatalogEntities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2, Factory, Box, Network, FileJson, Search, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { toast } from 'sonner';

export const EntityManagement = () => {
  const {
    manufacturers, models, protocols, loading,
    createManufacturer, deleteManufacturer, importManufacturers,
    createModel, deleteModel, importModels,
    createProtocol, deleteProtocol, importProtocols,
    getModelsForManufacturer,
  } = useCatalogEntities();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manufacturers');

  // Manufacturer state
  const [mfgName, setMfgName] = useState('');
  const [mfgAdding, setMfgAdding] = useState(false);
  const [mfgSearch, setMfgSearch] = useState('');
  const [mfgJsonOpen, setMfgJsonOpen] = useState(false);
  const [mfgJson, setMfgJson] = useState('');
  const [mfgImporting, setMfgImporting] = useState(false);

  // Model state
  const [modelMfgId, setModelMfgId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [modelAdding, setModelAdding] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelJsonOpen, setModelJsonOpen] = useState(false);
  const [modelJson, setModelJson] = useState('');
  const [modelImporting, setModelImporting] = useState(false);

  // Protocol state
  const [protoName, setProtoName] = useState('');
  const [protoDesc, setProtoDesc] = useState('');
  const [protoAdding, setProtoAdding] = useState(false);
  const [protoSearch, setProtoSearch] = useState('');
  const [protoJsonOpen, setProtoJsonOpen] = useState(false);
  const [protoJson, setProtoJson] = useState('');
  const [protoImporting, setProtoImporting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddMfg = async () => {
    if (!mfgName.trim()) return;
    setMfgAdding(true);
    try {
      await createManufacturer(mfgName);
      toast.success(`Manufacturer "${mfgName}" added`);
      setMfgName('');
    } catch (e: any) {
      toast.error(e?.code === '23505' ? 'Manufacturer already exists' : 'Error adding manufacturer');
    }
    setMfgAdding(false);
  };

  const handleDeleteMfg = async (id: string) => {
    setDeletingId(id);
    try { await deleteManufacturer(id); toast.success('Manufacturer deleted'); }
    catch { toast.error('Error deleting (may have linked models)'); }
    setDeletingId(null);
  };

  const handleImportMfg = async () => {
    setMfgImporting(true);
    try {
      const parsed = JSON.parse(mfgJson);
      const names = Array.isArray(parsed) ? parsed.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean) : [];
      if (names.length === 0) { toast.error('No valid names found'); setMfgImporting(false); return; }
      const count = await importManufacturers(names);
      toast.success(`Imported ${count} manufacturer(s)`);
      setMfgJsonOpen(false); setMfgJson('');
    } catch { toast.error('Invalid JSON'); }
    setMfgImporting(false);
  };

  const handleAddModel = async () => {
    if (!modelMfgId || !modelName.trim()) return;
    setModelAdding(true);
    try {
      await createModel(modelMfgId, modelName, modelDesc);
      toast.success(`Model "${modelName}" added`);
      setModelName(''); setModelDesc('');
    } catch (e: any) {
      toast.error(e?.code === '23505' ? 'Model already exists for this manufacturer' : 'Error adding model');
    }
    setModelAdding(false);
  };

  const handleDeleteModel = async (id: string) => {
    setDeletingId(id);
    try { await deleteModel(id); toast.success('Model deleted'); }
    catch { toast.error('Error deleting model'); }
    setDeletingId(null);
  };

  const handleImportModels = async () => {
    setModelImporting(true);
    try {
      const parsed = JSON.parse(modelJson);
      if (!Array.isArray(parsed)) { toast.error('Must be an array'); setModelImporting(false); return; }
      const items = parsed.filter((i: any) => i.manufacturer && i.model);
      if (items.length === 0) { toast.error('No valid items found'); setModelImporting(false); return; }
      const count = await importModels(items);
      toast.success(`Imported ${count} model(s)`);
      setModelJsonOpen(false); setModelJson('');
    } catch { toast.error('Invalid JSON'); }
    setModelImporting(false);
  };

  const handleAddProto = async () => {
    if (!protoName.trim()) return;
    setProtoAdding(true);
    try {
      await createProtocol(protoName, protoDesc);
      toast.success(`Protocol "${protoName}" added`);
      setProtoName(''); setProtoDesc('');
    } catch (e: any) {
      toast.error(e?.code === '23505' ? 'Protocol already exists' : 'Error adding protocol');
    }
    setProtoAdding(false);
  };

  const handleDeleteProto = async (id: string) => {
    setDeletingId(id);
    try { await deleteProtocol(id); toast.success('Protocol deleted'); }
    catch { toast.error('Error deleting protocol'); }
    setDeletingId(null);
  };

  const handleImportProtos = async () => {
    setProtoImporting(true);
    try {
      const parsed = JSON.parse(protoJson);
      if (!Array.isArray(parsed)) { toast.error('Must be an array'); setProtoImporting(false); return; }
      const items = parsed.map((i: any) => typeof i === 'string' ? { name: i } : { name: i.name, description: i.description }).filter((i: any) => i.name);
      if (items.length === 0) { toast.error('No valid items found'); setProtoImporting(false); return; }
      const count = await importProtocols(items);
      toast.success(`Imported ${count} protocol(s)`);
      setProtoJsonOpen(false); setProtoJson('');
    } catch { toast.error('Invalid JSON'); }
    setProtoImporting(false);
  };

  const filteredMfg = manufacturers.filter(m => m.name.toLowerCase().includes(mfgSearch.toLowerCase()));
  const filteredModels = models.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()));
  const filteredProtos = protocols.filter(p => p.name.toLowerCase().includes(protoSearch.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Reference Data</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {manufacturers.length} manufacturers · {models.length} models · {protocols.length} protocols
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="manufacturers" className="text-xs sm:text-sm">
                  <Factory className="h-4 w-4 mr-1.5" />Manufacturers ({manufacturers.length})
                </TabsTrigger>
                <TabsTrigger value="models" className="text-xs sm:text-sm">
                  <Box className="h-4 w-4 mr-1.5" />Models ({models.length})
                </TabsTrigger>
                <TabsTrigger value="protocols" className="text-xs sm:text-sm">
                  <Network className="h-4 w-4 mr-1.5" />Protocols ({protocols.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manufacturers" className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Add Manufacturer</Label>
                    <Input placeholder="e.g., Schneider Electric" value={mfgName} onChange={e => setMfgName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMfg()} />
                  </div>
                  <Button onClick={handleAddMfg} disabled={!mfgName.trim() || mfgAdding} size="sm">
                    {mfgAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMfgJsonOpen(true)}><FileJson className="h-4 w-4 mr-1" />Import</Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={mfgSearch} onChange={e => setMfgSearch(e.target.value)} className="pl-10 h-8 text-xs" />
                </div>
                <div className="rounded-md border max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-16">Models</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredMfg.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No manufacturers</TableCell></TableRow>
                      ) : filteredMfg.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell><Badge variant="secondary">{getModelsForManufacturer(m.id).length}</Badge></TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === m.id}>{deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{m.name}"?</AlertDialogTitle><AlertDialogDescription>This will also delete all models linked to this manufacturer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMfg(m.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="models" className="space-y-4">
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="space-y-1 w-48">
                    <Label className="text-xs">Manufacturer</Label>
                    <Select value={modelMfgId} onValueChange={setModelMfgId}><SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="flex-1 space-y-1 min-w-[150px]">
                    <Label className="text-xs">Model Name</Label>
                    <Input placeholder="e.g., PM5560" value={modelName} onChange={e => setModelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddModel()} />
                  </div>
                  <Button onClick={handleAddModel} disabled={!modelMfgId || !modelName.trim() || modelAdding} size="sm">{modelAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add</Button>
                  <Button variant="outline" size="sm" onClick={() => setModelJsonOpen(true)}><FileJson className="h-4 w-4 mr-1" />Import</Button>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="pl-10 h-8 text-xs" /></div>
                <div className="rounded-md border max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Manufacturer</TableHead><TableHead>Description</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredModels.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No models</TableCell></TableRow>
                      ) : filteredModels.map(m => {
                        const mfg = manufacturers.find(mf => mf.id === m.manufacturer_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell><Badge variant="outline">{mfg?.name || '—'}</Badge></TableCell>
                            <TableCell className="text-muted-foreground text-xs truncate max-w-[200px]">{m.description || '—'}</TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === m.id}>{deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{m.name}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteModel(m.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="protocols" className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1"><Label className="text-xs">Protocol Name</Label><Input placeholder="e.g., Modbus TCP" value={protoName} onChange={e => setProtoName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddProto()} /></div>
                  <div className="flex-1 space-y-1"><Label className="text-xs">Description (optional)</Label><Input placeholder="e.g., Standard Modbus over TCP/IP" value={protoDesc} onChange={e => setProtoDesc(e.target.value)} /></div>
                  <Button onClick={handleAddProto} disabled={!protoName.trim() || protoAdding} size="sm">{protoAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add</Button>
                  <Button variant="outline" size="sm" onClick={() => setProtoJsonOpen(true)}><FileJson className="h-4 w-4 mr-1" />Import</Button>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={protoSearch} onChange={e => setProtoSearch(e.target.value)} className="pl-10 h-8 text-xs" /></div>
                <div className="rounded-md border max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Protocol</TableHead><TableHead>Description</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredProtos.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No protocols</TableCell></TableRow>
                      ) : filteredProtos.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium font-mono">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{p.description || '—'}</TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === p.id}>{deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProto(p.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* JSON Import Dialogs */}
      <Dialog open={mfgJsonOpen} onOpenChange={setMfgJsonOpen}>
        <DialogContent><DialogHeader><DialogTitle>Import Manufacturers</DialogTitle><DialogDescription>Paste a JSON array: <code>["Schneider Electric", "ABB"]</code></DialogDescription></DialogHeader>
          <Textarea value={mfgJson} onChange={e => setMfgJson(e.target.value)} placeholder='["Schneider Electric", "ABB", "Siemens"]' className="font-mono text-xs min-h-[120px]" />
          <DialogFooter><Button variant="outline" onClick={() => setMfgJsonOpen(false)}>Cancel</Button><Button onClick={handleImportMfg} disabled={!mfgJson.trim() || mfgImporting} className="bg-[#2563EB]">{mfgImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modelJsonOpen} onOpenChange={setModelJsonOpen}>
        <DialogContent><DialogHeader><DialogTitle>Import Models</DialogTitle><DialogDescription>JSON: <code>{`[{"manufacturer":"ABB","model":"PM5560"}]`}</code></DialogDescription></DialogHeader>
          <Textarea value={modelJson} onChange={e => setModelJson(e.target.value)} placeholder={'[\n  {"manufacturer": "ABB", "model": "PM5560"}\n]'} className="font-mono text-xs min-h-[150px]" />
          <DialogFooter><Button variant="outline" onClick={() => setModelJsonOpen(false)}>Cancel</Button><Button onClick={handleImportModels} disabled={!modelJson.trim() || modelImporting} className="bg-[#2563EB]">{modelImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={protoJsonOpen} onOpenChange={setProtoJsonOpen}>
        <DialogContent><DialogHeader><DialogTitle>Import Protocols</DialogTitle><DialogDescription>JSON: <code>{`["Modbus TCP", "Modbus RTU"]`}</code></DialogDescription></DialogHeader>
          <Textarea value={protoJson} onChange={e => setProtoJson(e.target.value)} placeholder={'["Modbus TCP", "Modbus RTU", "DNP3"]'} className="font-mono text-xs min-h-[120px]" />
          <DialogFooter><Button variant="outline" onClick={() => setProtoJsonOpen(false)}>Cancel</Button><Button onClick={handleImportProtos} disabled={!protoJson.trim() || protoImporting} className="bg-[#2563EB]">{protoImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
};