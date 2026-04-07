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
  type FlatDisplayItem,
} from "@/lib/page-tree";

interface Props {
  pages: PageNode[];
  onPagesChange: (pages: PageNode[]) => void;
}

export function PageTreeBuilder({ pages, onPagesChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overInfo, setOverInfo] = useState<{
    id: string;
    position: "before" | "after" | "child";
  } | null>(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const flatItems = flattenForDisplay(pages);

  // Filter out collapsed children
  const visibleItems = flatItems.filter((item) => {
    if (item.parentId && collapsedIds.has(item.parentId)) return false;
    return true;
  });

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
      setOverInfo(null);
      return;
    }

    // Determine nesting based on horizontal offset
    const activeRect = event.active.rect.current.translated;
    const overItem = visibleItems.find((i) => i.id === over.id);
    if (!activeRect || !overItem) {
      setOverInfo(null);
      return;
    }

    // If dragging to the right of the over item, nest as child
    const overNode = findNode(pages, over.id as string);
    const horizontalOffset = (event.delta?.x ?? 0);

    if (
      horizontalOffset > 30 &&
      overItem.depth === 0 &&
      overNode &&
      overNode.id !== active.id
    ) {
      setOverInfo({ id: over.id as string, position: "child" });
    } else {
      setOverInfo({ id: over.id as string, position: "after" });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      setOverInfo(null);
      return;
    }

    const position = overInfo?.id === over.id ? overInfo.position : "after";
    const result = moveNode(pages, active.id as string, over.id as string, position);
    onPagesChange(result);
    setOverInfo(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverInfo(null);
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
          <div className="border rounded-lg divide-y">
            {visibleItems.map((item) => (
              <SortablePageItem
                key={item.id}
                item={item}
                isOver={overInfo?.id === item.id}
                overPosition={overInfo?.id === item.id ? overInfo.position : null}
                hasChildren={item.node.children.length > 0}
                isCollapsed={collapsedIds.has(item.id)}
                canDelete={totalPages > 1}
                onRemove={() => handleRemove(item.id)}
                onRename={(title) => handleRename(item.id, title)}
                onToggleCollapse={() => toggleCollapse(item.id)}
                isDragging={activeId === item.id}
              />
            ))}
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
      className={`group flex items-center gap-1.5 py-2 pr-2 text-sm ${
        isOver && overPosition === "child"
          ? "bg-muted/50"
          : ""
      }`}
    >
      {/* Drop indicator line */}
      {isOver && overPosition === "after" && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground" />
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
