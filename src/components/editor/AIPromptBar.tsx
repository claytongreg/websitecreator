"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/lib/editor/store";
import { Loader2, Send, Undo2, Redo2 } from "lucide-react";

const MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini", cost: "~$0.001" },
  { id: "gpt-4o", name: "GPT-4o", cost: "~$0.005" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku", cost: "~$0.002" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet", cost: "~$0.008" },
  { id: "gemini-2.0-flash", name: "Gemini Flash", cost: "~$0.001" },
];

interface Props {
  siteId: string;
  pageSlug: string;
}

export function AIPromptBar({ siteId, pageSlug }: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
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
          pageSlug,
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

  const selectedModel = MODELS.find((m) => m.id === model);

  return (
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

      {/* Model picker */}
      <Select value={model} onValueChange={(v) => v && setModel(v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex items-center justify-between gap-2 w-full">
                <span>{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.cost}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      {/* Cost display */}
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {selectedModel && (
          <span className="mr-2">{selectedModel.cost}/edit</span>
        )}
        <span className="font-medium">
          ${(sessionCostCents / 100).toFixed(3)} session
        </span>
      </div>
    </div>
  );
}
