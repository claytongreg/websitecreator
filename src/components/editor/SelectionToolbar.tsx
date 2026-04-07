"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor/store";
import { Trash2, Copy, Type, Paintbrush, Sparkles } from "lucide-react";

interface Props {
  onAiEdit: () => void;
}

export function SelectionToolbar({ onAiEdit }: Props) {
  const { selectedElement, html, setHtml, pushAction, selectElement } =
    useEditorStore();

  if (!selectedElement) return null;

  const handleDelete = () => {
    // Remove the selected element from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const el = doc.querySelector(selectedElement.path);
    if (el) {
      const before = html;
      el.remove();
      const after = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
      pushAction({
        type: "delete",
        elementPath: selectedElement.path,
        before,
        after,
        timestamp: Date.now(),
      });
      selectElement(null);
    }
  };

  const handleDuplicate = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const el = doc.querySelector(selectedElement.path);
    if (el && el.parentElement) {
      const before = html;
      const clone = el.cloneNode(true) as Element;
      el.parentElement.insertBefore(clone, el.nextSibling);
      const after = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
      pushAction({
        type: "insert",
        elementPath: selectedElement.path,
        before,
        after,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div className="border-b px-4 py-2 flex items-center gap-2 text-sm">
      <span className="text-muted-foreground mr-2">
        &lt;{selectedElement.tagName}&gt;
      </span>

      {selectedElement.textContent && (
        <span className="text-xs text-muted-foreground truncate max-w-48 mr-2">
          &quot;{selectedElement.textContent.slice(0, 40)}
          {(selectedElement.textContent.length ?? 0) > 40 ? "..." : ""}&quot;
        </span>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" title="Edit with AI" onClick={onAiEdit}>
          <Sparkles className="w-3 h-3 mr-1" />
          AI Edit
        </Button>
        <Button variant="ghost" size="sm" title="Edit text">
          <Type className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" title="Edit styles">
          <Paintbrush className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" title="Duplicate" onClick={handleDuplicate}>
          <Copy className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Delete"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
