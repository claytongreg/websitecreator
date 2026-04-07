"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useEditorStore } from "@/lib/editor/store";
import { Loader2, Send, Undo2, Redo2, ImagePlus } from "lucide-react";
import { PhotoWidget } from "./PhotoWidget";

interface Props {
  siteId: string;
  pageSlug: string;
}

export function AIPromptBar({ siteId }: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    html,
    selectedElement,
    isAiLoading,
    setAiLoading,
    pushAction,
    sessionCostCents,
    addCost,
    undo,
    redo,
    canUndo,
    canRedo,
    isPhotoWidgetOpen,
    setPhotoWidgetOpen,
  } = useEditorStore();

  const handleSubmit = async () => {
    if (!prompt.trim() || isAiLoading) return;

    setAiLoading(true);
    const before = html;

    try {
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          siteId,
          currentHtml: html,
          selectedElement: selectedElement
            ? {
                path: selectedElement.path,
                tagName: selectedElement.tagName,
                outerHTML: selectedElement.outerHTML,
              }
            : null,
        }),
      });

      if (!resp.ok) throw new Error("AI request failed");

      const data = await resp.json();

      if (data.html) {
        pushAction({
          type: "edit",
          elementPath: selectedElement?.path ?? "document",
          before,
          after: data.html,
          timestamp: Date.now(),
        });
      }

      if (data.costCents) {
        addCost(data.costCents);
      }

      setPrompt("");
    } catch (err) {
      console.error("AI edit failed:", err);
    } finally {
      setAiLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div>
      {/* Photo Widget (expandable panel above prompt bar) */}
      {isPhotoWidgetOpen && <PhotoWidget siteId={siteId} />}

      {/* Main prompt bar */}
      <div className="border-t px-4 py-3 flex items-center gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Model picker with pricing */}
        <ModelSelector value={model} onChange={setModel} />

        {/* Photo generation toggle */}
        <Button
          variant={isPhotoWidgetOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setPhotoWidgetOpen(!isPhotoWidgetOpen)}
          title="Generate photo"
        >
          <ImagePlus className="w-4 h-4" />
        </Button>

        {/* Prompt input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            placeholder={
              selectedElement
                ? `Edit <${selectedElement.tagName}>... e.g. "make this blue and larger"`
                : 'Describe a change... e.g. "add a testimonials section"'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={isAiLoading}
          />
        </div>

        {/* Send */}
        <Button onClick={handleSubmit} disabled={!prompt.trim() || isAiLoading}>
          {isAiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        {/* Session cost */}
        <div className="text-xs text-muted-foreground whitespace-nowrap font-mono">
          ${(sessionCostCents / 100).toFixed(3)}
        </div>
      </div>
    </div>
  );
}
