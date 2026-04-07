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

// All available models with clear pricing
// Prices shown include 200% markup (3x API cost)
const MODELS = [
  // Budget
  { id: "gpt-4o-mini",                name: "GPT-4o Mini",       provider: "OpenAI",    tier: "budget",  costPer: "$0.003" },
  { id: "gemini-2.0-flash",           name: "Gemini 2.0 Flash",  provider: "Google",    tier: "budget",  costPer: "$0.003" },
  { id: "claude-haiku-4-5-20251001",  name: "Claude Haiku 4.5",  provider: "Anthropic", tier: "budget",  costPer: "$0.006" },
  // Standard
  { id: "gpt-4o",                     name: "GPT-4o",            provider: "OpenAI",    tier: "standard", costPer: "$0.015" },
  { id: "gemini-2.0-pro",             name: "Gemini 2.0 Pro",    provider: "Google",    tier: "standard", costPer: "$0.012" },
  // Premium
  { id: "claude-sonnet-4-20250514",   name: "Claude Sonnet 4",   provider: "Anthropic", tier: "premium",  costPer: "$0.024" },
];

const TIER_LABELS: Record<string, string> = {
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
};

interface Props {
  siteId: string;
  pageSlug: string;
}

export function AIPromptBar({ siteId }: Props) {
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

  // Group models by tier for the dropdown
  const tiers = ["budget", "standard", "premium"];

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

      {/* Model picker with pricing */}
      <Select value={model} onValueChange={(v) => v && setModel(v)}>
        <SelectTrigger className="w-52">
          <SelectValue>
            {selectedModel && (
              <span className="flex items-center gap-2">
                <span className="truncate">{selectedModel.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {selectedModel.costPer}
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-72">
          {tiers.map((tier) => {
            const tierModels = MODELS.filter((m) => m.tier === tier);
            if (tierModels.length === 0) return null;
            return (
              <div key={tier}>
                <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {TIER_LABELS[tier]}
                </div>
                {tierModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.provider}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {m.costPer}/edit
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            );
          })}
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

      {/* Session cost */}
      <div className="text-xs text-muted-foreground whitespace-nowrap font-mono">
        ${(sessionCostCents / 100).toFixed(3)}
      </div>
    </div>
  );
}
