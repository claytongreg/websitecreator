"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PageInfo {
  slug: string;
  title: string;
}

interface Props {
  siteId: string;
  pages: PageInfo[];
  currentSlug: string;
  siteName: string;
  onReorder?: (pages: PageInfo[]) => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224;

export function PageTree({ siteId, pages, currentSlug, siteName, onReorder }: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Drag-to-reorder handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = pages.findIndex((p) => p.slug === active.id);
    const newIndex = pages.findIndex((p) => p.slug === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...pages];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder?.(reordered);
  }

  const activeItem = activeId ? pages.find((p) => p.slug === activeId) : null;

  return (
    <div
      className="border-r flex flex-col relative shrink-0"
      style={{ width: `${width}px` }}
    >
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm truncate">{siteName}</h3>
        <p className="text-xs text-muted-foreground">Pages</p>
      </div>

      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((p) => p.slug)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-2 space-y-1">
              {pages.map((page) => (
                <SortablePageTile
                  key={page.slug}
                  page={page}
                  siteId={siteId}
                  isActive={page.slug === currentSlug}
                  isDragging={activeId === page.slug}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg text-sm">
                <GripVertical className="w-3 h-3 text-muted-foreground" />
                <FileText className="w-3 h-3 shrink-0" />
                {activeItem.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Plus className="w-3 h-3 mr-2" />
          Add Page
        </Button>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
      />
    </div>
  );
}

// ── Sortable page tile ─────────────────────────────────────────────────────

interface SortablePageTileProps {
  page: PageInfo;
  siteId: string;
  isActive: boolean;
  isDragging: boolean;
}

function SortablePageTile({ page, siteId, isActive, isDragging }: SortablePageTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.slug });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <Link
        href={`/editor/${siteId}/${page.slug}`}
        className={`flex-1 flex items-center gap-2 px-2 py-2 rounded text-sm ${
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        }`}
      >
        <FileText className="w-3 h-3 shrink-0" />
        {page.title}
      </Link>
    </div>
  );
}
