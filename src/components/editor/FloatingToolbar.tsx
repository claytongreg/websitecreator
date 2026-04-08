"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/lib/editor/store";
import {
  getElementType,
  deleteElement,
  duplicateElement,
  replaceElementContent,
} from "@/lib/editor/element-utils";
import {
  Sparkles,
  Type,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  MoveHorizontal,
  ImageIcon,
  Move,
} from "lucide-react";
import { TextToolbox } from "./TextToolbox";
import { ImageToolbox } from "./ImageToolbox";

interface FloatingToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onAiEdit: () => void;
  siteId: string;
}

export function FloatingToolbar({ iframeRef, onAiEdit, siteId }: FloatingToolbarProps) {
  const { selectedElement, html, pushAction, selectElement } =
    useEditorStore();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [contentValue, setContentValue] = useState("");
  const [resizeOpen, setResizeOpen] = useState(false);
  const [textToolboxOpen, setTextToolboxOpen] = useState(false);
  const [imageToolboxOpen, setImageToolboxOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close panels when selection changes
  useEffect(() => {
    setContentOpen(false);
    setResizeOpen(false);
    setTextToolboxOpen(false);
    setImageToolboxOpen(false);
  }, [selectedElement?.path]);

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

  const handleDragMove = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_start_drag" },
      "*"
    );
  };

  const handleContentOpen = () => {
    setContentValue(selectedElement?.textContent ?? "");
    setContentOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleContentApply = () => {
    if (!selectedElement) return;
    const result = replaceElementContent(html, selectedElement.path, contentValue);
    if (result) {
      pushAction({
        type: "edit",
        elementPath: selectedElement.path,
        before: html,
        after: result,
        timestamp: Date.now(),
      });
    }
    setContentOpen(false);
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
        <>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${textToolboxOpen ? "bg-accent" : ""}`}
            title="Text formatting"
            onClick={() => {
              setTextToolboxOpen(!textToolboxOpen);
              setContentOpen(false);
              setResizeOpen(false);
            }}
          >
            <Type className="w-3 h-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${contentOpen ? "bg-accent" : ""}`}
            title="Change content"
            onClick={() => contentOpen ? setContentOpen(false) : handleContentOpen()}
          >
            <Pencil className="w-3 h-3" />
            Content
          </Button>
        </>
      )}

      {/* Image — image elements only */}
      {elementType === "image" && (
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs gap-1 ${imageToolboxOpen ? "bg-accent" : ""}`}
          title="Change image"
          onClick={() => {
            setImageToolboxOpen(!imageToolboxOpen);
            setContentOpen(false);
            setResizeOpen(false);
            setTextToolboxOpen(false);
          }}
        >
          <ImageIcon className="w-3 h-3" />
          Image
        </Button>
      )}

      {/* Drag to move — all elements */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5"
        title="Drag to move"
        onClick={handleDragMove}
      >
        <Move className="w-3 h-3" />
      </Button>

      {/* Move Up/Down — all elements */}
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

      {/* Resize width */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-1.5 ${resizeOpen ? "bg-accent" : ""}`}
        title="Resize width"
        onClick={() => setResizeOpen(!resizeOpen)}
      >
        <MoveHorizontal className="w-3 h-3" />
      </Button>

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

  const contentPanel = contentOpen && position ? (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-2 w-72"
      style={{ top: position.top + 44, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <Textarea
        ref={textareaRef}
        value={contentValue}
        onChange={(e) => setContentValue(e.target.value)}
        className="text-sm min-h-[80px] resize-y"
        placeholder="Enter new content..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleContentApply();
          }
        }}
      />
      <div className="flex justify-end gap-1 mt-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setContentOpen(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleContentApply}
        >
          Apply
        </Button>
      </div>
    </div>
  ) : null;

  const resizePanel = resizeOpen && position ? (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-1.5 flex gap-1"
      style={{ top: position.top + 44, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {["25%", "33%", "50%", "75%", "100%", "auto"].map((w) => (
        <Button
          key={w}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "wc_resize", width: w === "auto" ? "" : w },
              "*"
            );
            setResizeOpen(false);
          }}
        >
          {w}
        </Button>
      ))}
    </div>
  ) : null;

  const textToolbox = textToolboxOpen && position ? (
    <TextToolbox iframeRef={iframeRef} position={position} />
  ) : null;

  const imageToolbox = imageToolboxOpen && position ? (
    <ImageToolbox iframeRef={iframeRef} position={position} siteId={siteId} />
  ) : null;

  return createPortal(
    <>
      {toolbar}
      {contentPanel}
      {resizePanel}
      {textToolbox}
      {imageToolbox}
    </>,
    document.body
  );
}
