"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/lib/editor/store";
import { insertSnippetHtml } from "@/lib/editor/element-utils";
import { snippetCategories, type Snippet } from "@/lib/editor/snippets";

interface AddContentPanelProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function AddContentPanel({ iframeRef }: AddContentPanelProps) {
  const [activeCategory, setActiveCategory] = useState("sections");
  const [open, setOpen] = useState(false);
  const { html, selectedElement, pushAction, selectElement } = useEditorStore();

  const handleInsert = (snippet: Snippet) => {
    const result = insertSnippetHtml(
      html,
      snippet.html,
      snippet.insertMode,
      selectedElement?.path
    );
    if (result) {
      pushAction({
        type: "insert",
        elementPath: selectedElement?.path ?? "body",
        before: html,
        after: result,
        timestamp: Date.now(),
      });
    }
    setOpen(false);
    // Deselect and tell iframe
    selectElement(null);
    iframeRef.current?.contentWindow?.postMessage({ type: "wc_deselect" }, "*");
  };

  const category = snippetCategories.find((c) => c.id === activeCategory);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={8} className="w-80 p-0">
        {/* Category tabs */}
        <div className="flex border-b">
          {snippetCategories.map((cat) => (
            <button
              key={cat.id}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Snippet grid */}
        <ScrollArea className="max-h-72">
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {category?.snippets.map((snippet) => (
              <button
                key={snippet.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-colors text-center cursor-pointer"
                onClick={() => handleInsert(snippet)}
              >
                <span className="text-xs font-medium">{snippet.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
