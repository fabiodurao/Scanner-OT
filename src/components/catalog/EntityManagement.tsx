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
import { Plus, Trash2, Loader2, Factory, Box, Network, FileJson, Search, ChevronDown, ChevronRight, Database, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const EntityManagement = () => {
  const {
    manufacturers, models, protocols, loading,
    createManufacturer, updateManufacturer, deleteManufacturer, importManufacturers,
    createModel, updateModel, deleteModel, importModels,
    createProtocol, updateProtocol, deleteProtocol, importProtocols,
    getModelsForManufacturer,
  } = useCatalogEntities();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manufacturers');

  // Add state
  const [mfgName, setMfgName] = useState('');
  const [mfgAdding, setMfgAdding] = useState(false);
  const [mfgSearch, setMfgSearch] = useState('');
  const [mfgJsonOpen, setMfgJsonOpen] = useState(false);
  const [mfgJson, setMfgJson] = useState('');
  const [mfgImporting, setMfgImporting] = useState(false);

  const [modelMfgId, setModelMfgId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [modelAdding, setModelAdding] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelJsonOpen, setModelJsonOpen] = useState(false);
  const [modelJson, setModelJson] = useState('');
  const [modelImporting, setModelImporting] = useState(false);

  const [protoName, setProtoName] = useState('');
  const [protoDesc, setProtoDesc] = useState('');
  const [protoAdding, setProtoAdding] = useState(false);
  const [protoSearch, setProtoSearch] = useState('');
  const [protoJsonOpen, setProtoJsonOpen] = useState(false);
  const [protoJson, setProtoJson] = useState('');
  const [protoImporting, setProtoImporting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Inline edit state
  const [editingMfgId, setEditingMfgId] = useState<string | null>(null);
  const [editingMfgName, setEditingMfgName] = useState('');
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [editingModelDesc, setEditingModelDesc] = useState('');
  const [editingProtoId, setEditingProtoId] = useState<string | null>(null);
  const [editingProtoName, setEditingProtoName] = useState('');
  const [editingProtoDesc, setEditingProtoDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // --- Manufacturer handlers ---
  const handleAddMfg = async () => {
    if (!mfgName.trim()) return;
    setMfgAdding(true);
    try { await createManufacturer(mfgName); toast.success(`Manufacturer "${mfgName}" added`); setMfgName(''); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Already exists' : 'Error'); }
    setMfgAdding(false);
  };
  const handleDeleteMfg = async (id: string) => {
    setDeletingId(id);
    try { await deleteManufacturer(id); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Error deleting manufacturer'); }
    setDeletingId(null);
  };
  const handleSaveMfgEdit = async () => {
    if (!editingMfgId || !editingMfgName.trim()) return;
    setSavingEdit(true);
    try { await updateManufacturer(editingMfgId, editingMfgName); toast.success('Updated'); setEditingMfgId(null); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Name already exists' : 'Error'); }
    setSavingEdit(false);
  };
  const handleImportMfg = async () => {
    setMfgImporting(true);
    try {
      const parsed = JSON.parse(mfgJson);
      const names = Array.isArray(parsed) ? parsed.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean) : [];
      if (names.length === 0) { toast.error('No valid names'); setMfgImporting(false); return; }
      const count = await importManufacturers(names);
      toast.success(`Imported ${count}`); setMfgJsonOpen(false); setMfgJson('');
    } catch { toast.error('Invalid JSON'); }
    setMfgImporting(false);
  };

  // --- Model handlers ---
  const handleAddModel = async () => {
    if (!modelMfgId || !modelName.trim()) return;
    setModelAdding(true);
    try { await createModel(modelMfgId, modelName, modelDesc); toast.success(`Model "${modelName}" added`); setModelName(''); setModelDesc(''); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Already exists' : 'Error'); }
    setModelAdding(false);
  };
  const handleDeleteModel = async (id: string) => {
    setDeletingId(id);
    try { await deleteModel(id); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Error deleting model'); }
    setDeletingId(null);
  };
  const handleSaveModelEdit = async () => {
    if (!editingModelId || !editingModelName.trim()) return;
    setSavingEdit(true);
    try { await updateModel(editingModelId, editingModelName, editingModelDesc); toast.success('Updated'); setEditingModelId(null); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Name already exists' : 'Error'); }
    setSavingEdit(false);
  };
  const handleImportModels = async () => {
    setModelImporting(true);
    try {
      const parsed = JSON.parse(modelJson);
      if (!Array.isArray(parsed)) { toast.error('Must be array'); setModelImporting(false); return; }
      const items = parsed.filter((i: any) => i.manufacturer && i.model);
      if (items.length === 0) { toast.error('No valid items'); setModelImporting(false); return; }
      const count = await importModels(items);
      toast.success(`Imported ${count}`); setModelJsonOpen(false); setModelJson('');
    } catch { toast.error('Invalid JSON'); }
    setModelImporting(false);
  };

  // --- Protocol handlers ---
  const handleAddProto = async () => {
    if (!protoName.trim()) return;
    setProtoAdding(true);
    try { await createProtocol(protoName, protoDesc); toast.success(`Protocol "${protoName}" added`); setProtoName(''); setProtoDesc(''); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Already exists' : 'Error'); }
    setProtoAdding(false);
  };
  const handleDeleteProto = async (id: string) => {
    setDeletingId(id);
    try { await deleteProtocol(id); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Error deleting protocol'); }
    setDeletingId(null);
  };
  const handleSaveProtoEdit = async () => {
    if (!editingProtoId || !editingProtoName.trim()) return;
    setSavingEdit(true);
    try { await updateProtocol(editingProtoId, editingProtoName, editingProtoDesc); toast.success('Updated'); setEditingProtoId(null); }
    catch (e: any) { toast.error(e?.code === '23505' ? 'Name already exists' : 'Error'); }
    setSavingEdit(false);
  };
  const handleImportProtos = async () => {
    setProtoImporting(true);
    try {
      const parsed = JSON.parse(protoJson);
      if (!Array.isArray(parsed)) { toast.error('Must be array'); setProtoImporting(false); return; }
      const items = parsed.map((i: any) => typeof i === 'string' ? { name: i } : { name: i.name, description: i.description }).filter((i: any) => i.name);
      if (items.length === 0) { toast.error('No valid items'); setProtoImporting(false); return; }
      const count = await importProtocols(items);
      toast.success(`Imported ${count}`); setProtoJsonOpen(false); setProtoJson('');
    } catch { toast.error('Invalid JSON'); }
    setProtoImporting(false);
  };

  const filteredMfg = manufacturers.filter(m => m.name.toLowerCase().includes(mfgSearch.toLowerCase()));
  const filteredModels = models.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()));
  const filteredProtos = protocols.filter(p => p.name.toLowerCase().includes(protoSearch.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Reference Data</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{manufacturers.length} manufacturers · {models.length} models · {protocols.length} protocols</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="manufacturers" className="text-xs sm:text-sm"><Factory className="h-4 w-4 mr-1.5" />Manufacturers ({manufacturers.length})</TabsTrigger>
                <TabsTrigger value="models" className="text-xs sm:text-sm"><Box className="h-4 w-4 mr-1.5" />Models ({models.length})</TabsTrigger>
                <TabsTrigger value="protocols" className="text-xs sm:text-sm"><Network className="h-4 w-4 mr-1.5" />Protocols ({protocols.length})</TabsTrigger>
              </TabsList>

              {/* MANUFACTURERS */}
              <TabsContent value="manufacturers" className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1"><Label className="text-xs">Add Manufacturer</Label><Input placeholder="e.g., Schneider Electric" value={mfgName} onChange={e => setMfgName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMfg()} /></div>
                  <Button onClick={handleAddMfg} disabled={!mfgName.trim() || mfgAdding} size="sm">{mfgAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add</Button>
                  <Button variant="outline" size="sm" onClick={() => setMfgJsonOpen(true)}><FileJson className="h-4 w-4 mr-1" />Import</Button>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={mfgSearch} onChange={e => setMfgSearch(e.target.value)} className="pl-10 h-8 text-xs" /></div>
                <div className="rounded-md border max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-16">Models</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredMfg.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No manufacturers</TableCell></TableRow>
                      ) : filteredMfg.map(m => (
                        <TableRow key={m.id}>
                          <TableCell>
                            {editingMfgId === m.id ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingMfgName} onChange={e => setEditingMfgName(e.target.value)} className="h-7 text-xs flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveMfgEdit(); if (e.key === 'Escape') setEditingMfgId(null); }} />
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 shrink-0" onClick={handleSaveMfgEdit} disabled={savingEdit}><Check className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingMfgId(null)}><X className="h-3.5 w-3.5" /></Button>
                              </div>
                            ) : (
                              <span className="font-medium">{m.name}</span>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="secondary">{getModelsForManufacturer(m.id).length}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600" onClick={() => { setEditingMfgId(m.id); setEditingMfgName(m.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === m.id}>{deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{m.name}"?</AlertDialogTitle><AlertDialogDescription>This will also delete all models linked to this manufacturer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMfg(m.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* MODELS */}
              <TabsContent value="models" className="space-y-4">
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="space-y-1 w-48"><Label className="text-xs">Manufacturer</Label><Select value={modelMfgId} onValueChange={setModelMfgId}><SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex-1 space-y-1 min-w-[150px]"><Label className="text-xs">Model Name</Label><Input placeholder="e.g., PM5560" value={modelName} onChange={e => setModelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddModel()} /></div>
                  <Button onClick={handleAddModel} disabled={!modelMfgId || !modelName.trim() || modelAdding} size="sm">{modelAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Add</Button>
                  <Button variant="outline" size="sm" onClick={() => setModelJsonOpen(true)}><FileJson className="h-4 w-4 mr-1" />Import</Button>
                </div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="pl-10 h-8 text-xs" /></div>
                <div className="rounded-md border max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Manufacturer</TableHead><TableHead>Description</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredModels.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No models</TableCell></TableRow>
                      ) : filteredModels.map(m => {
                        const mfg = manufacturers.find(mf => mf.id === m.manufacturer_id);
                        const isEditing = editingModelId === m.id;
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editingModelName} onChange={e => setEditingModelName(e.target.value)} className="h-7 text-xs" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveModelEdit(); if (e.key === 'Escape') setEditingModelId(null); }} />
                              ) : (
                                <span className="font-medium">{m.name}</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline">{mfg?.name || '—'}</Badge></TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Input value={editingModelDesc} onChange={e => setEditingModelDesc(e.target.value)} className="h-7 text-xs flex-1" placeholder="Description" onKeyDown={e => { if (e.key === 'Enter') handleSaveModelEdit(); if (e.key === 'Escape') setEditingModelId(null); }} />
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 shrink-0" onClick={handleSaveModelEdit} disabled={savingEdit}><Check className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingModelId(null)}><X className="h-3.5 w-3.5" /></Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs truncate max-w-[200px]">{m.description || '—'}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600" onClick={() => { setEditingModelId(m.id); setEditingModelName(m.name); setEditingModelDesc(m.description || ''); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === m.id}>{deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{m.name}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteModel(m.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* PROTOCOLS */}
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
                    <TableHeader><TableRow><TableHead>Protocol</TableHead><TableHead>Description</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredProtos.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No protocols</TableCell></TableRow>
                      ) : filteredProtos.map(p => {
                        const isEditing = editingProtoId === p.id;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editingProtoName} onChange={e => setEditingProtoName(e.target.value)} className="h-7 text-xs font-mono" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveProtoEdit(); if (e.key === 'Escape') setEditingProtoId(null); }} />
                              ) : (
                                <span className="font-medium font-mono">{p.name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Input value={editingProtoDesc} onChange={e => setEditingProtoDesc(e.target.value)} className="h-7 text-xs flex-1" placeholder="Description" onKeyDown={e => { if (e.key === 'Enter') handleSaveProtoEdit(); if (e.key === 'Escape') setEditingProtoId(null); }} />
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 shrink-0" onClick={handleSaveProtoEdit} disabled={savingEdit}><Check className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setEditingProtoId(null)}><X className="h-3.5 w-3.5" /></Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">{p.description || '—'}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600" onClick={() => { setEditingProtoId(p.id); setEditingProtoName(p.name); setEditingProtoDesc(p.description || ''); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" disabled={deletingId === p.id}>{deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></AlertDialogTrigger>
                                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProto(p.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
        <DialogContent><DialogHeader><DialogTitle>Import Manufacturers</DialogTitle><DialogDescription>JSON array: <code>["Schneider Electric", "ABB"]</code></DialogDescription></DialogHeader>
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