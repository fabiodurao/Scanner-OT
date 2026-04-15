import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileArchive, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PcapFile } from '@/types/upload';

interface SortableFileItemProps {
  file: PcapFile;
  index: number;
  onDownload: (file: PcapFile) => void;
  onDelete: (file: PcapFile) => void;
  isDownloading: boolean;
  isDeleting: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

const SortableFileItem = ({ file, index, onDownload, onDelete, isDownloading, isDeleting }: SortableFileItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-3",
        isDragging && "shadow-lg border-2 border-purple-300 bg-purple-50 dark:bg-purple-950/30 z-50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded touch-none flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-muted-foreground w-6 text-center font-medium text-xs flex-shrink-0">
          #{index + 1}
        </span>
        <FileArchive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm truncate" title={file.original_filename}>
            {file.original_filename}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size_bytes)}</span>
            <Badge 
              variant="secondary"
              className={
                file.upload_status === 'completed' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                  : file.upload_status === 'uploading'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
              }
            >
              {file.upload_status === 'completed' ? 'Completed' : 
               file.upload_status === 'uploading' ? 'Uploading' : 'Error'}
            </Badge>
            {file.completed_at && (
              <span>{format(new Date(file.completed_at), 'MM/dd/yyyy HH:mm')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {file.upload_status === 'completed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(file)}
            disabled={isDownloading}
            className="h-8 w-8 p-0"
            title="Download file"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              title="Delete file"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{file.original_filename}" from S3 storage and the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(file)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

interface SortableSessionFilesProps {
  files: PcapFile[];
  onReorder: (files: PcapFile[]) => void;
  onDownload: (file: PcapFile) => void;
  onDelete: (file: PcapFile) => void;
  downloadingFileId: string | null;
  deletingFileId: string | null;
}

export const SortableSessionFiles = ({ 
  files, 
  onReorder, 
  onDownload, 
  onDelete,
  downloadingFileId,
  deletingFileId 
}: SortableSessionFilesProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id);
      const newIndex = files.findIndex((f) => f.id === over.id);
      const newFiles = arrayMove(files, oldIndex, newIndex);
      onReorder(newFiles);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {files.map((file, index) => (
            <SortableFileItem
              key={file.id}
              file={file}
              index={index}
              onDownload={onDownload}
              onDelete={onDelete}
              isDownloading={downloadingFileId === file.id}
              isDeleting={deletingFileId === file.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};