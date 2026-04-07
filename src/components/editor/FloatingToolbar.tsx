"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor/store";
import {
  getElementType,
  deleteElement,
  duplicateElement,
} from "@/lib/editor/element-utils";
import {
  Sparkles,
  Type,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface FloatingToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onAiEdit: () => void;
}

export function FloatingToolbar({ iframeRef, onAiEdit }: FloatingToolbarProps) {
  const { selectedElement, html, pushAction, selectElement } =
    useEditorStore();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const computePosition = useCallback(() => {
    if (!selectedElement || !iframeRef.current) {
      setPosition(null);
      return;
    }

    const iframeRect = iframeRef.current.getBoundingClientRect();
    const elRect = selectedElement.boundingRect;

    const toolbarWidth = 280;
    const toolbarHeight = 40;
    const gap = 8;

    let top = iframeRect.top + elRect.y - toolbarHeight - gap;
    let left = iframeRect.left + elRect.x + elRect.width / 2 - toolbarWidth / 2;

    // Flip below if too close to top
    if (top < 8) {
      top = iframeRect.top + elRect.y + elRect.height + gap;
    }

    // Clamp horizontal
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

    setPosition({ top, left });
  }, [selectedElement, iframeRef]);

  useEffect(() => {
    computePosition();
  }, [computePosition]);

  // Recompute on window scroll/resize
  useEffect(() => {
    if (!selectedElement) return;
    const handler = () => computePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [selectedElement, computePosition]);

  if (!mounted || !selectedElement || !position) return null;

  const elementType = getElementType(selectedElement);

  const handleDelete = () => {
    const result = deleteElement(html, selectedElement.path);
    if (result) {
      pushAction({
        type: "delete",
        elementPath: selectedElement.path,
        before: html,
        after: result,
        timestamp: Date.now(),
      });
      selectElement(null);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wc_deselect" },
        "*"
      );
    }
  };

  const handleDuplicate = () => {
    const result = duplicateElement(html, selectedElement.path);
    if (result) {
      pushAction({
        type: "insert",
        elementPath: selectedElement.path,
        before: html,
        after: result,
        timestamp: Date.now(),
      });
    }
  };

  const handleEditText = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_trigger_edit" },
      "*"
    );
  };

  const handleMoveUp = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_move_up" },
      "*"
    );
  };

  const handleMoveDown = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_move_down" },
      "*"
    );
  };

  const toolbar = (
    <div
      className="fixed z-50 flex items-center gap-0.5 bg-white rounded-lg shadow-xl border px-1 py-0.5"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tag indicator */}
      <span className="text-[10px] text-muted-foreground px-1.5 font-mono">
        &lt;{selectedElement.tagName}&gt;
      </span>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* AI Edit — always shown */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1"
        title="Edit with AI"
        onClick={onAiEdit}
      >
        <Sparkles className="w-3 h-3" />
        AI
      </Button>

      {/* Edit Text — text elements only */}
      {elementType === "text" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          title="Edit text"
          onClick={handleEditText}
        >
          <Type className="w-3 h-3" />
          Edit
        </Button>
      )}

      {/* Move Up/Down — sections only */}
      {elementType === "section" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            title="Move up"
            onClick={handleMoveUp}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            title="Move down"
            onClick={handleMoveDown}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </>
      )}

      {/* Duplicate — always shown */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5"
        title="Duplicate"
        onClick={handleDuplicate}
      >
        <Copy className="w-3 h-3" />
      </Button>

      {/* Delete — always shown */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 text-destructive hover:text-destructive"
        title="Delete"
        onClick={handleDelete}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  return createPortal(toolbar, document.body);
}
