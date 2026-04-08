"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PageNode } from "@/types";
import {
  flattenForDisplay,
  createPageNode,
  collectSlugs,
  removeNode,
  moveNode,
  updateNodeTitle,
  findNode,
  PRESET_PAGES,
  MAX_NESTING_DEPTH,
  type FlatDisplayItem,
} from "@/lib/page-tree";

interface Props {
  pages: PageNode[];
  onPagesChange: (pages: PageNode[]) => void;
}

export function PageTreeBuilder({ pages, onPagesChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    overId: string;
    targetId: string;
    position: "before" | "after" | "child";
    depth: number;
  } | null>(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const flatItems = flattenForDisplay(pages);

  // Filter out items whose any ancestor is collapsed
  const visibleItems: FlatDisplayItem[] = [];
  const hiddenIds = new Set<string>();
  for (const item of flatItems) {
    if (item.parentId && (collapsedIds.has(item.parentId) || hiddenIds.has(item.parentId))) {
      hiddenIds.add(item.id);
    } else {
      visibleItems.push(item);
    }
  }

  const allSlugs = collectSlugs(pages);
  const usedSlugs = new Set(allSlugs);
  const unusedPresets = PRESET_PAGES.filter((p) => !usedSlugs.has(p.slug));

  // Count total pages (flat)
  const totalPages = flatItems.length;

  function handleAddPage() {
    const title = newPageTitle.trim();
    if (!title) return;
    const node = createPageNode(title, allSlugs);
    onPagesChange([...pages, node]);
    setNewPageTitle("");
  }

  function handleAddPreset(preset: { title: string; slug: string }) {
    const node: PageNode = {
      id: crypto.randomUUID(),
      title: preset.title,
      slug: preset.slug,
      children: [],
    };
    onPagesChange([...pages, node]);
  }

  function handleRemove(id: string) {
    if (totalPages <= 1) return;
    onPagesChange(removeNode(pages, id));
  }

  function handleRename(id: string, title: string) {
    if (!title.trim()) return;
    onPagesChange(updateNodeTitle(pages, id, title, allSlugs));
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropTarget(null);
      return;
    }

    const overItem = visibleItems.find((i) => i.id === over.id);
    if (!overItem) {
      setDropTarget(null);
      return;
    }

    // Use pointer's absolute X position relative to the container
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      setDropTarget(null);
      return;
    }

    const activatorEvent = event.activatorEvent as PointerEvent;
    const currentX = activatorEvent.clientX + (event.delta?.x ?? 0);
    const relativeX = currentX - containerRect.left;

    // Each depth level = 28px indent, 20px base offset
    const rawDepth = Math.max(0, Math.floor((relativeX - 20) / 28));
    const maxAllowedDepth = Math.min(overItem.depth + 1, MAX_NESTING_DEPTH);
    const projectedDepth = Math.min(rawDepth, maxAllowedDepth);

    const overId = over.id as string;

    if (projectedDepth > overItem.depth) {
      // Nest as child of the hovered item
      setDropTarget({
        overId,
        targetId: overId,
        position: "child",
        depth: overItem.depth + 1,
      });
    } else if (projectedDepth < overItem.depth) {
      // Un-nest: find ancestor at the projected depth
      let ancestor = overItem;
      while (ancestor.depth > projectedDepth && ancestor.parentId) {
        const parent = visibleItems.find((i) => i.id === ancestor.parentId);
        if (!parent) break;
        ancestor = parent;
      }
      // Don't target the item being dragged
      if (ancestor.id === (active.id as string)) {
        setDropTarget(null);
        return;
      }
      setDropTarget({
        overId,
        targetId: ancestor.id,
        position: "after",
        depth: projectedDepth,
      });
    } else {
      // Same level: use direction to determine before/after
      const activeIndex = visibleItems.findIndex((i) => i.id === active.id);
      const overIndex = visibleItems.findIndex((i) => i.id === over.id);
      const position = activeIndex > overIndex ? "before" : "after";
      setDropTarget({
        overId,
        targetId: overId,
        position,
        depth: overItem.depth,
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    if (!event.over || !dropTarget) {
      setDropTarget(null);
      return;
    }

    const result = moveNode(
      pages,
      event.active.id as string,
      dropTarget.targetId,
      dropTarget.position
    );
    onPagesChange(result);
    setDropTarget(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDropTarget(null);
  }

  const activeNode = activeId ? findNode(pages, activeId) : null;

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={visibleItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={containerRef} className="border rounded-lg divide-y">
            {visibleItems.map((item) => {
              const isOver = dropTarget?.overId === item.id;
              return (
                <SortablePageItem
                  key={item.id}
                  item={item}
                  isOver={isOver}
                  overPosition={isOver ? dropTarget.position : null}
                  indicatorDepth={isOver ? dropTarget.depth : undefined}
                  hasChildren={item.node.children.length > 0}
                  isCollapsed={collapsedIds.has(item.id)}
                  canDelete={totalPages > 1}
                  onRemove={() => handleRemove(item.id)}
                  onRename={(title) => handleRename(item.id, title)}
                  onToggleCollapse={() => toggleCollapse(item.id)}
                  isDragging={activeId === item.id}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeNode ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg text-sm">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span>{activeNode.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add page input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a page..."
          value={newPageTitle}
          onChange={(e) => setNewPageTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddPage();
            }
          }}
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleAddPage}
          disabled={!newPageTitle.trim()}
          className="px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Preset suggestions */}
      {unusedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedPresets.map((preset) => (
            <button
              key={preset.slug}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="text-xs px-2.5 py-1 border rounded-full hover:bg-muted transition-colors"
            >
              + {preset.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sortable item ───────────────────────────────────────────────────────────

interface SortablePageItemProps {
  item: FlatDisplayItem;
  isOver: boolean;
  overPosition: "before" | "after" | "child" | null;
  indicatorDepth?: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  canDelete: boolean;
  isDragging: boolean;
  onRemove: () => void;
  onRename: (title: string) => void;
  onToggleCollapse: () => void;
}

function SortablePageItem({
  item,
  isOver,
  overPosition,
  indicatorDepth,
  hasChildren,
  isCollapsed,
  canDelete,
  isDragging,
  onRemove,
  onRename,
  onToggleCollapse,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${item.depth * 28 + 8}px`,
    opacity: isDragging ? 0.3 : 1,
  };

  function startEdit() {
    setEditValue(item.node.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    setIsEditing(false);
    if (editValue.trim() && editValue.trim() !== item.node.title) {
      onRename(editValue.trim());
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group flex items-center gap-1.5 py-2 pr-2 text-sm ${
        isOver && overPosition === "child"
          ? "bg-muted/50"
          : ""
      }`}
    >
      {/* Drop indicator line */}
      {isOver && overPosition !== "child" && (
        <div
          className="absolute right-0 h-0.5 bg-primary pointer-events-none z-10"
          style={{
            left: `${(indicatorDepth ?? item.depth) * 28 + 8}px`,
            ...(overPosition === "before" ? { top: -1 } : { bottom: -1 }),
          }}
        />
      )}

      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Collapse toggle for parents */}
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      ) : (
        <span className="w-3.5" />
      )}

      {/* Title (click to edit) */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="flex-1 bg-transparent border-b border-foreground/30 outline-none text-sm py-0"
        />
      ) : (
        <span
          className="flex-1 cursor-text truncate"
          onDoubleClick={startEdit}
        >
          {item.node.title}
          <span className="text-muted-foreground ml-2 text-xs opacity-0 group-hover:opacity-100">
            /{item.node.slug}
          </span>
        </span>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground disabled:opacity-0 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
