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
import { GripVertical, FileArchive } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortablePcapFile {
  id: string;
  original_filename: string;
  size_bytes: number;
}

interface SortableFileItemProps {
  file: SortablePcapFile;
  index: number;
  formatFileSize: (bytes: number) => string;
}

const SortableFileItem = ({ file, index, formatFileSize }: SortableFileItemProps) => {
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
        "flex items-center gap-2 text-sm p-2 rounded-lg border bg-white",
        isDragging && "shadow-lg border-purple-300 bg-purple-50 z-50",
        !isDragging && "hover:bg-slate-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </button>
      <span className="text-muted-foreground w-6 text-center font-medium">
        #{index + 1}
      </span>
      <FileArchive className="h-4 w-4 text-slate-400 flex-shrink-0" />
      <span className="truncate flex-1">{file.original_filename}</span>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatFileSize(file.size_bytes)}
      </span>
    </div>
  );
};

interface SortableFileListProps {
  files: SortablePcapFile[];
  onReorder: (files: SortablePcapFile[]) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
};

export const SortableFileList = ({ files, onReorder }: SortableFileListProps) => {
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
        <div className="space-y-1">
          {files.map((file, index) => (
            <SortableFileItem
              key={file.id}
              file={file}
              index={index}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};