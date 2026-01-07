import { MainLayout } from '@/components/layout/MainLayout';
import { mockSites, mockPcapFiles } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload as UploadIcon, Download, FileArchive, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PcapStatus } from '@/types';

const statusConfig: Record<PcapStatus, { label: string; icon: React.ElementType; color: string }> = {
  uploading: { label: 'Enviando', icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  uploaded: { label: 'Enviado', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'Processando', icon: Loader2, color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Erro', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return bytes + ' bytes';
};

const Upload = () => {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const getSiteName = (siteId: string) => {
    const site = mockSites.find(s => s.id === siteId);
    return site?.name || siteId;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // In a real implementation, this would handle the file upload
    console.log('Files dropped:', e.dataTransfer.files);
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Upload PCAP</h1>
          <p className="text-muted-foreground mt-1">
            Faça upload de arquivos de captura de tráfego OT
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Novo Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Site de destino</label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecione um site" />
                </SelectTrigger>
                <SelectContent>
                  {mockSites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}
                ${!selectedSite ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-emerald-400'}
              `}
            >
              <UploadIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <div className="text-lg font-medium mb-2">
                Arraste arquivos PCAP aqui
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar
              </div>
              <Button disabled={!selectedSite}>
                Selecionar Arquivo
              </Button>
              <div className="text-xs text-muted-foreground mt-4">
                Suporte a arquivos de até 20 GB
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Arquivos Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPcapFiles.map((file) => {
                    const status = statusConfig[file.status];
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={file.id}>
                        <TableCell className="font-mono text-sm">
                          {file.filename}
                        </TableCell>
                        <TableCell>{getSiteName(file.site_id)}</TableCell>
                        <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                        <TableCell className="text-sm">
                          {file.uploaded_by}
                        </TableCell>
                        <TableCell>
                          {new Date(file.uploaded_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${file.status === 'uploading' || file.status === 'processing' ? 'animate-spin' : ''}`} />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={file.status === 'uploading'}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Upload;