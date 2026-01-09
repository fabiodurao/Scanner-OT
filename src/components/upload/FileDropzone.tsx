import { useCallback, useState, useRef } from 'react';
import { Upload, FileArchive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

export const FileDropzone = ({ files, onFilesChange, disabled }: FileDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      f.name.endsWith('.pcap') || f.name.endsWith('.pcapng') || f.name.endsWith('.pcap.zst') || f.name.endsWith('.pcap.gz')
    );
    onFilesChange([...files, ...droppedFiles]);
  }, [disabled, files, onFilesChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange([...files, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  }, [files, onFilesChange]);

  const handleButtonClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleDropzoneClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  return (
    <div className="space-y-4">
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept=".pcap,.pcapng,.pcap.zst,.pcap.gz" 
        onChange={handleFileSelect} 
        className="hidden" 
        disabled={disabled} 
      />
      <div
        onClick={handleDropzoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-[#2563EB] bg-blue-50' : 'border-slate-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#2563EB]/50'
        )}
      >
        <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
        <div className="text-lg font-medium mb-2">Drag PCAP files here</div>
        <div className="text-sm text-muted-foreground mb-4">or click to select</div>
        <Button 
          type="button" 
          disabled={disabled} 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick();
          }}
        >
          Select Files
        </Button>
        <div className="text-xs text-muted-foreground mt-4">Supports .pcap, .pcapng, .pcap.zst, .pcap.gz</div>
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{files.length} file(s)</span>
            <span className="text-muted-foreground">Total: {formatFileSize(files.reduce((s, f) => s + f.size, 0))}</span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <FileArchive className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">({formatFileSize(file.size)})</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeFile(i); }} disabled={disabled}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};